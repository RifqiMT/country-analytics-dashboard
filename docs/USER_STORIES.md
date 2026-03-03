## User stories – Country Analytics Platform

Stories are grouped by feature area and mapped to personas from `USER_PERSONAS.md`.

---

### 1. Country dashboard

- **US‑1.1 – Select country**
  - As a **Regional Strategy Lead**, I want to search and select a country by name or code so that I can quickly switch the dashboard focus.
  - Acceptance:
    - Search supports partial matches on name, ISO2, and ISO3.
    - Keyboard navigation (↑/↓/Enter) works in the suggestion list.

- **US‑1.2 – See high‑level summary**
  - As a **Country Economist**, I want to see key financial, demographic, and health metrics for the selected country so that I can understand its macro context at a glance.
  - Acceptance:
    - Summary shows latest non‑null GDP metrics, population, age breakdown, and life expectancy.
    - The data window clearly indicates the actual years covered.

- **US‑1.3 – Adjust year range**
  - As an **Analyst**, I want to adjust the year range (start/end) so that I can focus on a specific historical window.
  - Acceptance:
    - Inputs clamp to the valid global window.
    - “Full range”, “Last 10 years”, and “Last 5 years” presets update the dashboard immediately.

---

### 2. Time‑series & charts

- **US‑2.1 – Switch time frequency**
  - As a **Policy Analyst**, I want to toggle between annual and sub‑annual frequencies so that I can inspect trends with different levels of granularity.
  - Acceptance:
    - Frequency switches between weekly, monthly, quarterly, yearly.
    - Sub‑annual views clearly indicate they are interpolated.

- **US‑2.2 – Compare metrics on one chart**
  - As a **Strategy Lead**, I want to overlay financial, population, and health metrics on a single timeline so that I can visually correlate them.
  - Acceptance:
    - At least one metric is always active.
    - Legend and tag toggles align with the selected metrics.

- **US‑2.3 – Understand period‑over‑period change**
  - As a **Market Expansion Manager**, I want to see how much a metric changed since the previous period so that I can better judge momentum.
  - Acceptance:
    - Tooltip shows % change (WoW/MoM/QoQ/YoY) where previous data exists.
    - Up/down/flat states are colour‑coded and use simple wording.

---

### 3. Population & age structure

- **US‑3.1 – See age group breakdown**
  - As a **Market Expansion Manager**, I want to see population by age groups so that I can infer product portfolio relevance.
  - Acceptance:
    - Pie slices and details match the 0–14, 15–64, 65+ group definitions.
    - Values show both % and absolute counts.

- **US‑3.2 – See age group trends**
  - As a **Country Economist**, I want to see YoY changes in age groups so that I can detect ageing or youth bulges.
  - Acceptance:
    - Age‑group rows in the summary and tables include YoY % where two years are available.

---

### 4. Country comparison

- **US‑4.1 – Compare to global context**
  - As a **Regional Strategy Lead**, I want to compare a country’s GDP and population to the average country and global total so that I can understand its relative weight.
  - Acceptance:
    - Comparison card shows selected country, simple average, and global totals for each metric.
    - YoY lines appear as secondary text under each value.

- **US‑4.2 – Toggle extra demographic detail**
  - As an **Analyst**, I want to optionally expand age‑group comparison rows so that I can see more detail without cluttering the default view.
  - Acceptance:
    - Core metrics vs “+ Population age breakdown” toggle works without reloading data.

---

### 5. Global analytics – Map

- **US‑5.1 – Visualise metric on world map**
  - As a **Policy Analyst**, I want to colour countries by a selected metric so that I can see spatial patterns at a glance.
  - Acceptance:
    - Metric selector changes the shading and legend title.
    - Countries without data are shown with a neutral colour.

- **US‑5.2 – Inspect country details on hover**
  - As a **Strategy Lead**, I want to see a tooltip for each country that shows its metric value and name so I can answer specific follow‑up questions.
  - Acceptance:
    - Tooltip shows country name, flag, value, and effective data year.
    - Moving the mouse leaves the tooltip in sync with the hovered country.

---

### 6. Global analytics – Tables

- **US‑6.1 – Rank countries by metric**
  - As any **analyst persona**, I want to sort global tables by any metric so that I can quickly rank countries.
  - Acceptance:
    - Clicking a column header toggles between ascending and descending.
    - Sorting applies independently within each sub‑toggle (General, Financial, Health & demographics).

- **US‑6.2 – Focus on high‑level dimensions**
  - As a **Strategy Lead**, I want separate views for general, financial, and health/demographic metrics so that tables remain readable.
  - Acceptance:
    - Sub‑toggles switch between three distinct column layouts.
    - Each layout has a clear default sort:
      - General: total area desc.
      - Financial: GDP Nominal desc.
      - Health & demographics: population total desc.

- **US‑6.3 – See YoY at a glance**
  - As a **Policy Analyst**, I want YoY information to be visible but not overwhelming so that I can quickly understand directionality.
  - Acceptance:
    - Each numeric cell shows main value (top line) and YoY (secondary green line) where applicable.
    - If YoY cannot be calculated, the line is omitted (no placeholder “–”).

---

### 7. Reliability and data quality

- **US‑7.1 – Handle missing data gracefully**
  - As any user, I do not want the app to error or show confusing outputs when data is missing.
  - Acceptance:
    - “–” is shown for missing values; no broken charts or NaN.
    - For global metrics, the loader falls back to earlier years when a year is completely empty.

- **US‑7.2 – Communicate methodology**
  - As a **Data/BI Analyst**, I want to understand at a high level how metrics are computed so that I can trust and re‑use them.
  - Acceptance:
    - README and PRD document indicator codes, date ranges, and fallback rules.
    - Comparison card includes a short note that global aggregations are illustrative.

