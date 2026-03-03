## Product metrics & OKRs – Country Analytics Platform

This document defines how we measure the success of the Country Analytics Platform and how those metrics map to product and engineering work.

---

### 1. North‑star and core metrics

#### 1.1 North‑star metric

- **NS‑1: Weekly Active Analytical Sessions (WAAS)**
  - **Definition**: Count of distinct sessions per week in which a user:
    - Views at least one country dashboard **and**
    - Performs at least one interactive action (e.g. changes year range, switches frequency, switches tab, or sorts a global table).
  - **Why it matters**: Measures whether the tool is being actively used for analysis (not just opened once).

#### 1.2 Core engagement metrics

- **E‑1: Country coverage used**
  - **Definition**: Number of distinct countries viewed per week.
  - **Owner**: Product / Strategy.

- **E‑2: Depth of exploration**
  - **Definition**: Average number of views per session of:
    - Frequency changes on the unified timeline.
    - Sub‑toggle changes in global tables (General/Financial/Health).
    - Map metric switches.
  - **Owner**: Product / UX.

- **E‑3: Global vs. country balance**
  - **Definition**: Ratio of sessions that reach the **Global analytics** tab vs those that only use the **Country dashboard**.
  - **Owner**: Product.

---

### 2. Feature‑level metrics

#### 2.1 Country dashboard

- **CD‑1: Year‑range interaction rate**
  - % of sessions where the year range is changed from default.

- **CD‑2: Timeline metric diversity**
  - Average number of distinct metrics enabled on the unified timeline per session.

- **CD‑3: Age‑group breakdown usage**
  - % of sessions where the age‑group comparison toggle (“+ Population age breakdown”) is turned on at least once.

#### 2.2 Global analytics – Map

- **GM‑1: Map engagement rate**
  - % of sessions that open the Global view and stay on the map for at least 10 seconds.

- **GM‑2: Metric diversity (map)**
  - Number of unique metrics selected on the map per session.

#### 2.3 Global analytics – Tables

- **GT‑1: Sort interaction rate**
  - % of sessions where at least one table column is sorted (header clicked).

- **GT‑2: Sub‑toggle distribution**
  - Share of sessions that view each global table:
    - General, Financial, Health & demographics.

- **GT‑3: YoY visibility**
  - % of global table rows rendered with a non‑null YoY value for at least one metric.

---

### 3. Product‑team OKRs (example)

#### Objective 1 – Make the platform a daily tool for strategy and policy teams

- **KR1.1**: Reach **50 Weekly Active Analytical Sessions** within 3 months of pilot launch.
- **KR1.2**: At least **60% of active sessions** interact with both the country dashboard and global analytics views.
- **KR1.3**: Median session duration ≥ **5 minutes**.

#### Objective 2 – Improve depth and quality of analysis

- **KR2.1**: At least **40% of sessions** modify the year range from the default.
- **KR2.2**: Average distinct metrics enabled on the unified timeline ≥ **3**.
- **KR2.3**: At least **30% of sessions** use the Health & demographics global table.

#### Objective 3 – Ensure data trust and reliability

- **KR3.1**: < **1%** of API calls result in unhandled errors.
- **KR3.2**: No critical bugs where charts or tables crash on missing data across a full quarter.
- **KR3.3**: Documentation (README + PRD) stays in sync with deployed features (no more than 1 release behind).

---

### 4. Instrumentation guidelines

> Note: The current codebase is a pure front‑end application without analytics wiring. These guidelines describe the intended event model for future telemetry.

#### 4.1 Event naming

- Use a `product_area.action` pattern:
  - `dashboard.country_changed`
  - `dashboard.year_range_changed`
  - `timeline.frequency_changed`
  - `timeline.metric_toggled`
  - `global.map_metric_changed`
  - `global.table_sort_changed`
  - `global.table_view_changed` (general/financial/health)

- Each event should include:
  - `country_iso2` (if relevant)
  - `year` or `year_range`
  - `metric_id` (for timeline, map, or tables)
  - `view` (country_dashboard | global_map | global_table)

#### 4.2 Privacy & PII

- No user PII is collected in the current design.
- If authentication is added, event payloads should reference **user IDs** and **organisation IDs** only via opaque, hashed identifiers.

---

### 5. Operational & engineering metrics

Although this is a front‑end‑only project, engineering quality is still important:

- **ENG‑1: Bundle size**
  - Track the main bundle size and aim to keep it lean, optimising chart and map dependencies as needed.

- **ENG‑2: API latency (client‑perceived)**
  - Measure time from initiating a dashboard fetch to data rendered.

- **ENG‑3: Error rate**
  - Log and track:
    - Failed API calls (network / 5xx).
    - React error boundaries triggered due to unexpected data shapes.

These can be consumed by a future observability stack if the app is deployed in production.

