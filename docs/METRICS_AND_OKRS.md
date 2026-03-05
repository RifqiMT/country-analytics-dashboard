# Product Metrics & OKRs – Country Analytics Platform

This document defines how we measure the success of the Country Analytics Platform and how those metrics map to product and engineering work. For **data metrics** (GDP, population, etc.), see `PRODUCT_METRICS.md`.

---

## 1. North-Star and Core Metrics

### 1.1 North-Star Metric

| ID | Metric | Definition |
|----|--------|------------|
| **NS-1** | **Weekly Active Analytical Sessions (WAAS)** | Count of distinct sessions per week in which a user: (1) Views at least one country dashboard, and (2) Performs at least one interactive action (e.g. changes year range, switches frequency, switches tab, sorts a global table, sends a chat message) |

**Why it matters:** Measures whether the tool is being actively used for analysis, not just opened once.

### 1.2 Core Engagement Metrics

| ID | Metric | Definition | Owner |
|----|--------|------------|-------|
| **E-1** | Country coverage used | Number of distinct countries viewed per week | Product / Strategy |
| **E-2** | Depth of exploration | Average number of views per session: frequency changes, sub-toggle changes, map metric switches | Product / UX |
| **E-3** | Global vs. country balance | Ratio of sessions that reach Global analytics tab vs. only Country dashboard | Product |
| **E-4** | Source tab engagement | % of sessions that open the Source tab | Product |
| **E-5** | Analytics assistant engagement | % of sessions that open the Analytics assistant tab and send at least one message | Product |

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

### 2.5 Analytics Assistant

| ID | Metric | Definition |
|----|--------|------------|
| **CA-1** | Chat message rate | Average number of messages sent per session when Analytics assistant is used |
| **CA-2** | Source distribution | % of chat sessions by source: Dashboard data, Web search (Tavily), Groq, other LLMs |
| **CA-3** | Suggestion chip usage | % of chat sessions where at least one suggestion chip is clicked |

### 2.6 PESTEL

| ID | Metric | Definition |
|----|--------|------------|
| **PE-1** | PESTEL tab view rate | % of sessions that open the PESTEL tab |
| **PE-2** | PESTEL generate/refresh rate | % of PESTEL tab sessions where user triggers generate or refresh at least once |

### 2.7 Business Analytics

| ID | Metric | Definition |
|----|--------|------------|
| **BA-1** | Business Analytics tab view rate | % of sessions that open the Business Analytics tab |
| **BA-2** | Correlation scatter engagement | % of Business Analytics sessions where user changes X or Y metric at least once |
| **BA-3** | Correlation metric pairs | Number of unique X/Y metric pairs selected per session (when Business Analytics is used) |

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

### Objective 4 – Drive adoption of Analytics assistant

| Key Result | Target |
|------------|--------|
| **KR4.1** | At least 25% of sessions open the Analytics assistant tab |
| **KR4.2** | Among assistant users, average ≥ 2 messages per session |

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
| `business_analytics.tab_viewed` | User opens Business Analytics tab |
| `business_analytics.correlation_axes_changed` | User changes X or Y metric in correlation scatter |
| `global.table_sort_changed` | User sorts a table column |
| `global.table_view_changed` | User switches General/Financial/Health |
| `pestel.tab_viewed` | User opens PESTEL tab |
| `pestel.generate_clicked` | User triggers PESTEL generate or refresh |
| `source.search_used` | User enters search query |
| `source.filter_chip_clicked` | User clicks a source filter chip |
| `chat.message_sent` | User sends a chat message |
| `chat.suggestion_clicked` | User clicks a suggestion chip |
| `chat.model_changed` | User changes LLM model |
| `chat.source_received` | Assistant response received (payload: source type: Dashboard data | model label | Web search) |

### 4.2 Event Payload

Each event should include:

- `country_iso2` (if relevant)
- `year` or `year_range`
- `metric_id` (for timeline, map, or tables)
- `view` (country_dashboard | global_map | global_table | global_correlation | business_analytics | pestel | source | chat)

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
| **ENG-4** | Chat API latency | Time from chat send to response (LLM or fallback) |

These can be consumed by a future observability stack when the app is deployed in production.

---

## 6. Product Team OKR Cadence

- **Quarterly**: Review OKRs; update targets based on pilot feedback
- **Monthly**: Track core engagement metrics (E-1 through E-5)
- **Sprint**: Prioritise feature work that moves KR1–KR4 (e.g. Analytics assistant UX, Source tab discoverability)
