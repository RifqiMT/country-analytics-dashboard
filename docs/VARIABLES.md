# Variables documentation

This document describes **configuration and request variables**, **UI-derived series**, and the **metric catalog** used across the Country Analytics Platform. Canonical definitions and World Bank codes live in `backend/src/metrics.ts`; runtime labels include `shortLabel` from `GET /api/metrics`.

---

## 1. Application and environment variables

| Variable name | Friendly name | Definition | Formula | Location | Example |
|---------------|-----------------|------------|---------|----------|---------|
| `PORT` | API port | TCP port for the Express server. | N/A | `.env`, `backend/src/index.ts` | `4000` |
| `GROQ_API_KEY` | Groq API key | Enables LLM completions for Assistant, PESTEL, Porter. | N/A | `.env`, `backend/src/llm.ts` | `gsk_…` (server-only) |
| `GROQ_MODEL` | Groq model id | Overrides default chat model. | N/A | `.env`, `llm.ts` | `llama-3.3-70b-versatile` |
| `TAVILY_API_KEY` | Tavily API key | Optional web search context before LLM. | N/A | `.env`, `llm.ts` | Server-only secret |

---

## 2. Common API query parameters

| Variable name | Friendly name | Definition | Formula | Location | Example |
|---------------|-----------------|------------|---------|----------|---------|
| `cca3` | ISO 3166-1 alpha-3 code | Three-letter country identifier aligned with WDI economies. | N/A | `/api/country/:cca3`, `/api/dashboard/comparison`, correlation POST | `IDN`, `USA` |
| `start` | Range start year | First calendar year of the requested window (clamped). | `clamp` to `[MIN_DATA_YEAR, end]` | `/api/country/:cca3/series`, `/api/compare`, WLD series | `2000` |
| `end` | Range end year | Last calendar year of the window (clamped to current data year policy). | `clampYearRange` in backend | Same as above | `2026` |
| `metrics` | Metric id list | Comma-separated metric keys from the catalog. | N/A | Country series, WLD series | `gdp,population,inflation` |
| `year` | Reference year | Single-year selector for snapshots and some analyses. | `clampYear` | Global snapshot, global table, PESTEL/Porter body | `2023` |
| `metric` | Single metric id | Choropleth / snapshot metric key. | N/A | `/api/global/snapshot` | `gdp_per_capita` |
| `region` | Region filter | Region name for global table filtering. | N/A | `/api/global/table` | `Europe`, `All` |
| `category` | Table category | Preset column bundle for global table. | N/A | `/api/global/table` | `financial`, `education` |
| `metricX`, `metricY` | Correlation axes | Two catalog ids for scatter / Pearson r. | Pearson on paired years or countries | `/api/analysis/correlation-global`, POST correlation | `gdp_per_capita`, `life_expectancy` |
| `excludeIqr` | IQR outlier flag | When `true`, excludes outer quartiles before correlation (global). | Boolean query flag | `correlation-global` | `true` |
| `highlight` | Highlight ISO3 | Country emphasized on global scatter. | N/A | `correlation-global` | `BRA` |

---

## 3. UI-derived and display-only series

These identifiers appear in **charts or tables** but are not separate entries in `GET /api/metrics`; they are computed in the frontend (or implied rows) from catalog metrics.

| Variable name | Friendly name | Definition | Formula | Location | Example |
|---------------|-----------------|------------|---------|----------|---------|
| `unemployed` | Derived unemployed count | Estimated number of unemployed people for charting alongside labour force. | `(unemployment_ilo / 100) × labor_force_total` for each aligned year | `labourChartRows` in `frontend/src/lib/chartSeries.ts`; **Labour** accordion chart | For a year where unemployment is 5% and labour force is 100M → 5M |
| `labour` | Labour force (chart series) | Same underlying series as `labor_force_total`, exposed as chart column key `labour` for layout symmetry with `unemployed`. | Identity mapping from merged `labor_force_total` points | Same as above | Matches WDI-backed labour force total for that year |

---

## 4. Relationship overview (metrics and derivatives)

High-level **data lineage** (not every UI wiring). Solid lines indicate direct use in derivation or merge; the backend may apply additional gap-fill and WLD proxy after these relationships.

```mermaid
flowchart TB
  subgraph pop [Population base]
    population[population]
  end
  subgraph gdp [GDP family]
    gdp[gdp]
    gdp_ppp[gdp_ppp]
    gdp_per_capita[gdp_per_capita]
    gdp_per_capita_ppp[gdp_per_capita_ppp]
  end
  subgraph debt [Debt family]
    gov_debt_pct_gdp[gov_debt_pct_gdp]
    gov_debt_usd[gov_debt_usd]
  end
  subgraph labour [Labour display]
    unemployment_ilo[unemployment_ilo]
    labor_force_total[labor_force_total]
    unemployed_ui[unemployed UI]
  end
  subgraph age [Age shares]
    pop_age_0_14[pop_age_0_14]
    pop_15_64_pct[pop_15_64_pct]
    pop_age_65_plus[pop_age_65_plus]
  end
  population --> gdp_per_capita
  gdp --> gdp_per_capita
  gdp_ppp --> gdp_per_capita_ppp
  population --> gdp_per_capita_ppp
  gdp --> gov_debt_usd
  gov_debt_pct_gdp --> gov_debt_usd
  unemployment_ilo --> unemployed_ui
  labor_force_total --> unemployed_ui
  population --> age
```

---

## 5. Metric catalog (canonical ids)

**Friendly name** = `label` in `metrics.ts` (long form). Short UI strings use `shortLabel` from the API. **Formula** summarizes publisher definition or in-repo derivation; detailed narratives are in each metric’s `description` field.

The registered catalog currently contains **48** metrics (`METRICS` in `backend/src/metrics.ts`). Subsections below follow **financial → demographics → labour → health → education** for readability (not the array order in code).

### 5.1 Financial

| Variable ID | Friendly name | Definition | Formula / source logic | Where it appears | Example |
|-------------|----------------|------------|------------------------|------------------|---------|
| `gdp` | GDP (Nominal, US$) | Gross domestic product in current US dollars, merged from WDI and IMF WEO where gaps exist. | National accounts identity at publisher; gap-fill from IMF `NGDPD` scaled to US$ | Dashboard financial charts & KPIs; global map/table; correlation | Latest year point in country KPI strip |
| `gdp_ppp` | GDP (PPP, Intl$) | GDP in international dollars (purchasing power parity). | Publisher series; IMF PPP gap-fill where configured | Dashboard, global, WLD charts | Compared alongside nominal GDP in “GDP & debt” views |
| `gdp_per_capita` | GDP per capita (Nominal, US$) | Nominal GDP divided by population. | `GDP / population` conceptually; merged series per year | Dashboard, global, business analytics | Scatter vs life expectancy |
| `gdp_per_capita_ppp` | GDP per capita (PPP, Intl$) | PPP GDP divided by population. | `GDP (PPP) / population` | Dashboard, WLD | Side-by-side with nominal per capita |
| `gdp_growth` | GDP growth (annual %) | Real GDP growth rate, annual percentage. | Published WDI; **step** fill for interior gaps (no linear interpolation) | Dashboard KPI | YoY card on dashboard |
| `gov_debt_pct_gdp` | Central government debt, total (% of GDP) | Central government debt as a share of GDP. | `Debt / GDP × 100`; WDI + alternate code + IMF `GGXWDG_NGDP` for null years | Dashboard, global, PESTEL digest | Fiscal health KPI |
| `gov_debt_usd` | Central government debt, total (current US$) | Debt level in US dollars. | WDI `GC.DOD.TOTL.CD`, else `(gov_debt_pct_gdp / 100) × gdp` | Dashboard “GDP & debt” panels | Line chart with GDP |
| `inflation` | Inflation, consumer prices (annual %) | Consumer price inflation, annual %. | WDI + IMF `PCPIPCH` gap-fill | Dashboard macro panel | Macro chart |
| `interest_real` | Real interest rate (%) | Real interest rate where reported. | WDI | Dashboard (where exposed in bundle) | Rates section |
| `lending_rate` | Lending interest rate (%) | Bank lending rate to prime borrowers. | WDI | Dashboard macro chart | Alongside inflation |
| `poverty_headcount` | Poverty headcount ratio at $2.15 a day (2017 PPP) | International poverty line headcount. | WDI | Dashboard poverty KPIs | % of population |
| `poverty_national` | Poverty headcount ratio at national poverty lines (% of population) | National line poverty share. | WDI | Dashboard poverty KPIs | National comparison |

### 5.2 Demographics

| Variable ID | Friendly name | Definition | Formula / source logic | Where it appears | Example |
|-------------|----------------|------------|------------------------|------------------|---------|
| `population` | Population, total | Midyear population estimate. | WDI + IMF `LP` (millions) gap-fill | Dashboard header KPIs; per-capita denominators; global | Population card |
| `pop_age_0_14` | Population ages 0-14 (% of total) | Youth share of total population. | WDI; cross-band consistency may infer one band from others in pipeline | Dashboard age structure | % with implied count on card |
| `pop_15_64_pct` | Population ages 15-64 (% of total) | Working-age share. | WDI; same pipeline notes | Dashboard age chart | Labour context |
| `pop_age_65_plus` | Population ages 65+ (% of total) | Older-age share. | WDI | Dashboard age chart | Aging narrative |

### 5.3 Labour

| Variable ID | Friendly name | Definition | Formula / source logic | Where it appears | Example |
|-------------|----------------|------------|------------------------|------------------|---------|
| `unemployment_ilo` | Unemployment, total (% of labour force) — modeled ILO | Unemployment rate. | WDI / ILO modeled series | Dashboard macro & labour | Used with labour force for derived unemployed |
| `labour_force_participation` | Labor force participation rate, total (% pop 15+) | Participation rate. | WDI | Dashboard labour context | Structural labour supply |
| `labor_force_total` | Labor force, total | Absolute labour force. | WDI | Dashboard labour chart; drives `unemployed` | Count × unemployment rate → unemployed |

### 5.4 Health

| Variable ID | Friendly name | Definition | Formula / source logic | Where it appears | Example |
|-------------|----------------|------------|------------------------|------------------|---------|
| `life_expectancy` | Life expectancy at birth, total (years) | Life expectancy at birth. | WDI; may use male/female mean imputation in pipeline when total null | Dashboard health; correlation | Years |
| `mortality_under5` | Mortality rate, under-5 (per 1,000 live births) | Under-five mortality rate. | WDI | Dashboard health charts | Per 1,000 |
| `maternal_mortality` | Maternal mortality ratio (per 100,000 live births) | Maternal deaths per 100k live births. | WDI | Dashboard health | Maternal health KPI |
| `undernourishment` | Prevalence of undernourishment (% of population) | Undernourishment prevalence. | WDI | Dashboard health dual-axis chart | % |

### 5.5 Education

| Variable ID | Friendly name | Definition | Formula / source logic | Where it appears | Example |
|-------------|----------------|------------|------------------------|------------------|---------|
| `literacy_adult` | Literacy rate, adult total (% ages 15+) | Adult literacy. | WDI + UIS `LR.GALP.AG15T99` gap-fill where configured | Dashboard education | Literacy card |
| `school_primary_completion` | Primary completion rate, total (% of relevant age group) | Primary completion proxy. | WDI | Dashboard education | Completion chart |
| `enrollment_secondary` | School enrollment, secondary (% gross) | Gross secondary enrollment ratio. | WDI | Dashboard education | GER-style % |
| `teachers_primary` | Pupil-teacher ratio, primary | Pupils per teacher in primary. | WDI | Dashboard education | Ratio |
| `oosc_primary` | Out-of-school rate for children of primary school age (%) | Primary-age out of school. | WDI + UIS `ROFST.1.CP` | Dashboard / global approximations | Equity indicator |
| `oosc_secondary` | Out-of-school rate for adolescents of lower secondary school age (%) | Lower secondary OOSC. | WDI + UIS `ROFST.2.CP` | Dashboard | OOSC panel |
| `oosc_tertiary` | Out-of-school rate for youth of upper secondary school age (%) | Upper secondary OOSC. | WDI + UIS `ROFST.3.CP` | Dashboard | OOSC panel |
| `completion_secondary` | Lower secondary completion rate, total (% of relevant age group) | Lower secondary completion. | WDI + UIS `CR.2` | Dashboard | Completion |
| `completion_tertiary` | Gross graduation ratio, tertiary education | Tertiary graduation ratio. | WDI + UIS `GGR.6T7` | Dashboard | Tertiary outcomes |
| `reading_proficiency` | Learning poverty: reading (%) | Learning poverty reading metric. | WDI | Dashboard | Quality metric |
| `gpi_primary` | GPI proxy — school enrollment, primary (gross), gender parity index | Gender parity index proxy, primary. | WDI | Dashboard GPI block | Parity ~1 = balance |
| `gpi_secondary` | GPI proxy — school enrollment, secondary (gross), gender parity index | GPI proxy, secondary. | WDI | Dashboard | Parity |
| `gpi_tertiary` | GPI proxy — school enrollment, tertiary (gross), gender parity index | GPI proxy, tertiary. | WDI | Dashboard | Parity |
| `trained_teachers_pri` | Trained teachers in primary education (% of total teachers) | Share of trained primary teachers. | WDI | Dashboard | Quality input |
| `trained_teachers_sec` | Trained teachers in lower secondary education (% of total teachers) | Trained teachers, lower secondary. | WDI | Dashboard | Quality input |
| `trained_teachers_ter` | Trained teachers in upper secondary education (% of total teachers) | Trained teachers, upper secondary. | WDI | Dashboard | Quality input |
| `edu_expenditure_gdp` | Government expenditure on education, total (% of GDP) | Public education spend share. | WDI | Dashboard | Investment rate |
| `enrollment_primary_pct` | School enrollment, primary (% gross) | Gross primary enrollment. | WDI | Dashboard enrollment charts | GER |
| `enrollment_tertiary_pct` | School enrollment, tertiary (% gross) | Gross tertiary enrollment. | WDI | Dashboard | GER |
| `enrollment_primary_count` | Enrolment in primary education, both sexes (number) | Primary headcount enrollment. | WDI | Dashboard | Levels chart |
| `enrollment_secondary_count` | Enrolment in secondary education, both sexes (number) | Secondary headcount. | WDI | Dashboard | Levels chart |
| `enrollment_tertiary_count` | Enrolment in tertiary education, all programmes, both sexes (number) | Tertiary headcount. | WDI | Dashboard | Levels chart |
| `teachers_primary_count` | Teachers in primary education, total | Primary teacher headcount. | WDI | Dashboard | Staffing |
| `teachers_secondary_count` | Teachers in secondary education, total | Secondary teacher headcount. | WDI | Dashboard | Staffing |
| `teachers_tertiary_count` | Teachers in tertiary education programmes, total | Tertiary teacher headcount. | WDI | Dashboard | Staffing |

---

## 6. Maintenance

- When adding a metric: update `backend/src/metrics.ts`, `metricShortLabels.ts` if needed, any `DASHBOARD_METRICS` / `WLD_METRICS` strings in the frontend, and this document’s relevant subsection.
- For **live numeric examples**, call `GET /api/country/{CCA3}/series?metrics={id}&start=2000&end={currentYear}` — values change with publisher updates.
