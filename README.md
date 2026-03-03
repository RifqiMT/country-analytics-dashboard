## Country Analytics Platform

An analyst-grade web application for exploring **country-level financial, demographic, and basic health metrics** from 2000 to the latest available year, powered primarily by the World Bank World Development Indicators (WDI).

The tool is designed for **policy makers, strategy teams, economists, and corporate leaders** who need a fast, visual way to compare countries, understand trends, and communicate insights.

---

### 1. Product overview

- **Core value**: One place to understand how a country is performing across GDP, population, age structure, and life expectancy, with **time trends**, **YoY changes**, and **cross‑country comparisons**.
- **Audience**:
  - Strategy / analytics teams in corporates and governments
  - Country / regional heads and executives
  - Researchers and students who need a clean, explorable interface over public data
- **Key views**:
  - **Country dashboard** – deep dive on a single country
  - **Global analytics** – map and multi-view global tables for ranking and comparison

See `docs/PRD.md` for a complete functional specification and `docs/USER_PERSONAS.md` for detailed personas.

---

### 2. Feature summary

- **Country summary**
  - Country name, ISO2/ISO3 codes, flag, region, income level, capital city
  - Time window used (e.g. 2000–2024) based on actual data availability
  - General: timezone, currency (code, name, symbol), land area, total area
  - Financial metrics (with YoY): GDP nominal, GDP PPP, GDP per capita (nominal & PPP)
  - Health & demographics (with YoY): total population, life expectancy, 0–14 / 15–64 / 65+ breakdown

- **Unified time-series timeline**
  - Combined line chart for financial, population, and health metrics
  - Frequency toggles: **weekly, monthly, quarterly, yearly**
  - Sub‑annual frequencies are **interpolated** from annual data to maintain smooth trends
  - Custom tooltip showing:
    - Metric values (compact format)
    - Period‑over‑period change (WoW / MoM / QoQ / YoY)

- **Population by age group**
  - Pie chart and details panel for 0–14, 15–64, 65+
  - Each slice shows **absolute population** and **share of total**

- **Country comparison (selected vs global)**
  - Comparison card for the selected country vs:
    - **Average country** (simple average across all countries)
    - **Global total**
  - Metrics: GDP (nominal, PPP, per capita), population + YoY deltas
  - Toggle to expand/collapse age‑group breakdown rows

- **Global analytics – world map**
  - Choropleth map using `react-simple-maps` + `world-atlas`
  - Metric selector: GDP variants and population
  - Year selector decoupled from the country dashboard filters
  - Tooltip per country: name, flag, metric value, and effective data year

- **Global analytics – multi‑view tables**
  - Year selector with debounced input
  - **Sub‑toggles** for three global tables:
    - **General** – total area (km²) by country
    - **Financial** – GDP Nominal, GDP PPP, GDP / Capita, GDP / Capita PPP + YoY
    - **Health & demographics** – total population, 0–14, 15–64, 65+, and life expectancy + YoY
  - All visible numeric columns are **sortable asc/desc**

---

### 3. Data & business rules

- **Primary data source**: World Bank WDI (`src/api/worldBank.ts`)
  - Financial indicators:
    - `NY.GDP.MKTP.CD` – GDP (current US$)
    - `NY.GDP.MKTP.PP.CD` – GDP, PPP (current international $)
    - `NY.GDP.PCAP.CD` – GDP per capita (current US$)
    - `NY.GDP.PCAP.PP.CD` – GDP per capita, PPP (current international $)
  - Demographics:
    - `SP.POP.TOTL` – Population, total
    - `SP.POP.0014.TO.ZS` – ages 0–14 (% of total)
    - `SP.POP.1564.TO.ZS` – ages 15–64 (% of total)
    - `SP.POP.65UP.TO.ZS` – ages 65+ (% of total)
  - Health:
    - `SP.DYN.LE00.IN` – Life expectancy at birth, total (years)
  - Geography:
    - `AG.LND.TOTL.K2` – Land area (sq. km)
    - `AG.SRF.TOTL.K2` – Surface / total area (sq. km)

- **Coverage window**:
  - `DATA_MIN_YEAR = 2000`
  - `DATA_MAX_YEAR = currentYear - 2` (to avoid incomplete latest-year data)

- **Latest value logic**:
  - Dashboard snapshot uses **latest non‑null value up to the selected end year**.
  - Global tables:
    - For **GDP & population**, series are taken for the requested year; if an entire year is empty, the loader walks backwards until it finds a year with data.
    - For **area** and **life expectancy**, values are effectively static or slow‑moving, so the app takes the **latest non‑null observation per country** and reuses it across years.

- **Country code mapping**
  - World Bank sometimes uses ISO3 codes and aggregate regions.
  - The app filters to genuine countries using the World Bank country list (`fetchAllCountries`) and also uses REST Countries (`src/api/countryCodes.ts`) to bridge numeric → ISO2/ISO3 where needed (especially for the map).

More detailed product rules and edge cases (e.g. Taiwan coverage, Palestine naming) are documented in `docs/PRD.md` and `docs/PRODUCT_DOCUMENTATION_STANDARD.md`.

---

### 4. Tech stack & architecture

- **Frontend**: React 18 + TypeScript + Vite
- **State management**: local React state + `useCountryDashboard` hook
- **Charts**: `recharts` (line chart + pie chart)
- **Map**: `react-simple-maps` + `world-atlas`
- **HTTP client**: `axios`

Key modules:

- `src/App.tsx`
  - Top‑level layout and navigation between **Country dashboard** and **Global analytics**
  - Holds global filter state for global year and map metric
- `src/hooks/useCountryDashboard.ts`
  - Fetches country‑level series + snapshot
  - Manages country selection, year range, frequency, and selected metrics
- `src/api/worldBank.ts`
  - Strongly‑typed API layer for WDI and global metrics
  - Implements resampling windows, latest‑non‑null logic, and global aggregation helpers
- `src/components/*`
  - Presentational components for each section (summary, timeline, pie, tables, map)
- `src/types.ts`
  - Shared domain model: metrics, time points, country summaries, snapshots, global rows

See `docs/PRODUCT_DOCUMENTATION_STANDARD.md` and `docs/PRD.md` for a deeper architecture and domain overview.

---

### 5. Running and developing

From the `country-analytics-dashboard` directory:

```bash
npm install
npm run dev
```

Then open the URL printed by Vite (typically `http://localhost:5173`).

**Recommended practices**

- Keep all cross‑cutting types in `src/types.ts`.
- Add new external data integrations behind the `src/api/*` layer; never call APIs directly from components.
- Use the utilities in `src/utils/numberFormat.ts` and `src/utils/timeSeries.ts` for:
  - Compact number formatting (k, Mn, Bn, Tn)
  - Percentage formatting
  - Time‑series resampling (weekly/monthly/quarterly from annual)

---

### 6. Documentation index

Additional, more detailed documentation lives under `docs/`:

- `docs/PRODUCT_DOCUMENTATION_STANDARD.md` – how we organise product & tech docs
- `docs/PRD.md` – full product requirements document
- `docs/USER_PERSONAS.md` – primary & secondary personas
- `docs/USER_STORIES.md` – user stories grouped by persona and feature area
- `docs/METRICS_AND_OKRS.md` – product metrics, analytics events, OKRs

These files are intended to be **living documents** that evolve as the product grows. When you introduce a major feature, please update the relevant doc(s) alongside your code changes.
