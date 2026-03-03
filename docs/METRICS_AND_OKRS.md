# Product Metrics & OKRs – Country Analytics Platform

This document defines how we measure the success of the Country Analytics Platform and how those metrics map to product and engineering work.

---

## 1. North-Star and Core Metrics

### 1.1 North-Star Metric

| ID | Metric | Definition |
|----|--------|------------|
| **NS-1** | **Weekly Active Analytical Sessions (WAAS)** | Count of distinct sessions per week in which a user: (1) Views at least one country dashboard, and (2) Performs at least one interactive action (e.g. changes year range, switches frequency, switches tab, sorts a global table) |

**Why it matters:** Measures whether the tool is being actively used for analysis, not just opened once.

### 1.2 Core Engagement Metrics

| ID | Metric | Definition | Owner |
|----|--------|------------|-------|
| **E-1** | Country coverage used | Number of distinct countries viewed per week | Product / Strategy |
| **E-2** | Depth of exploration | Average number of views per session: frequency changes, sub-toggle changes, map metric switches | Product / UX |
| **E-3** | Global vs. country balance | Ratio of sessions that reach Global analytics tab vs. only Country dashboard | Product |
| **E-4** | Source tab engagement | % of sessions that open the Source tab | Product |

---

## 2. Feature-Level Metrics

### 2.1 Country Dashboard

| ID | Metric | Definition |
|----|--------|------------|
| **CD-1** | Year-range interaction rate | % of sessions where the year range is changed from default |
| **CD-2** | Timeline metric diversity | Average number of distinct metrics enabled on the unified timeline per session |
| **CD-3** | Age-group breakdown usage | % of sessions where the age-group comparison toggle is turned on at least once |

### 2.2 Global Analytics – Map

| ID | Metric | Definition |
|----|--------|------------|
| **GM-1** | Map engagement rate | % of sessions that open the Global view and stay on the map for at least 10 seconds |
| **GM-2** | Metric diversity (map) | Number of unique metrics selected on the map per session |

### 2.3 Global Analytics – Tables

| ID | Metric | Definition |
|----|--------|------------|
| **GT-1** | Sort interaction rate | % of sessions where at least one table column is sorted |
| **GT-2** | Sub-toggle distribution | Share of sessions that view each global table: General, Financial, Health & demographics |
| **GT-3** | YoY visibility | % of global table rows rendered with a non-null YoY value for at least one metric |

### 2.4 Source Tab

| ID | Metric | Definition |
|----|--------|------------|
| **SR-1** | Source search usage | % of Source tab sessions that use the search input |
| **SR-2** | Source filter usage | % of Source tab sessions that use a filter chip |

---

## 3. Product OKRs (Example)

### Objective 1 – Make the platform a daily tool for strategy and policy teams

| Key Result | Target |
|------------|--------|
| **KR1.1** | Reach 50 Weekly Active Analytical Sessions within 3 months of pilot launch |
| **KR1.2** | At least 60% of active sessions interact with both the country dashboard and global analytics views |
| **KR1.3** | Median session duration ≥ 5 minutes |

### Objective 2 – Improve depth and quality of analysis

| Key Result | Target |
|------------|--------|
| **KR2.1** | At least 40% of sessions modify the year range from the default |
| **KR2.2** | Average distinct metrics enabled on the unified timeline ≥ 3 |
| **KR2.3** | At least 30% of sessions use the Health & demographics global table |

### Objective 3 – Ensure data trust and reliability

| Key Result | Target |
|------------|--------|
| **KR3.1** | < 1% of API calls result in unhandled errors |
| **KR3.2** | No critical bugs where charts or tables crash on missing data across a full quarter |
| **KR3.3** | Documentation (README + PRD) stays in sync with deployed features (no more than 1 release behind) |

---

## 4. Instrumentation Guidelines

> **Note:** The current codebase is a pure front-end application without analytics wiring. These guidelines describe the intended event model for future telemetry.

### 4.1 Event Naming

Use a `product_area.action` pattern:

| Event | When |
|-------|------|
| `dashboard.country_changed` | User selects a new country |
| `dashboard.year_range_changed` | User changes start or end year |
| `timeline.frequency_changed` | User switches frequency |
| `timeline.metric_toggled` | User toggles a metric chip |
| `global.map_metric_changed` | User changes map metric |
| `global.table_sort_changed` | User sorts a table column |
| `global.table_view_changed` | User switches General/Financial/Health |
| `source.search_used` | User enters search query |
| `source.filter_chip_clicked` | User clicks a source filter chip |

### 4.2 Event Payload

Each event should include:

- `country_iso2` (if relevant)
- `year` or `year_range`
- `metric_id` (for timeline, map, or tables)
- `view` (country_dashboard | global_map | global_table | source)

### 4.3 Privacy & PII

- No user PII is collected in the current design
- If authentication is added, event payloads should reference **user IDs** and **organisation IDs** only via opaque, hashed identifiers

---

## 5. Operational & Engineering Metrics

| ID | Metric | Definition |
|----|--------|------------|
| **ENG-1** | Bundle size | Main bundle size; aim to keep lean |
| **ENG-2** | API latency (client-perceived) | Time from initiating dashboard fetch to data rendered |
| **ENG-3** | Error rate | Failed API calls (network / 5xx); React error boundaries triggered |

These can be consumed by a future observability stack when the app is deployed in production.
