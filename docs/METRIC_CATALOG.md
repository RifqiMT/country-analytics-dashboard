# Metric Catalog

Canonical source: `backend/src/metrics.ts`.

## Summary

- Total metrics currently defined: **59**
- Coverage spans general, financial, health, and education/labour indicators.

## Core Example Metrics (high-use)

| Metric ID | Friendly Name | Unit | Category |
| --- | --- | --- | --- |
| `gdp` | GDP (Nominal, current US$) | US$ | financial |
| `gdp_growth` | GDP growth (annual %) | % | financial |
| `gdp_per_capita` | GDP per capita (Nominal, US$) | US$ | financial |
| `gni_per_capita_atlas` | GNI per capita (Atlas method, US$) | US$ | financial |
| `population` | Population (total) | people | general |
| `inflation` | Inflation, consumer prices (annual %) | % | financial |
| `unemployment_ilo` | Unemployment rate (ILO modeled estimate) | % | labour |
| `gov_debt_pct_gdp` | Government debt (% of GDP) | % | financial |
| `life_expectancy` | Life expectancy at birth | years | health |
| `birth_rate` | Birth rate, crude | per 1,000 | health |
| `tb_incidence` | Tuberculosis incidence | per 100,000 | health |
| `uhc_service_coverage` | UHC service coverage index | index | health |
| `hospital_beds` | Hospital beds | per 1,000 | health |
| `physicians_density` | Physicians density | per 1,000 | health |
| `nurses_midwives_density` | Nurses and midwives density | per 10,000 | health |
| `immunization_measles` | Measles immunization coverage | % | health |
| `health_expenditure_gdp` | Current health expenditure (% GDP) | % | health |
| `literacy_adult` | Adult literacy rate | % | education |
| `poverty_headcount` | Poverty headcount ratio at $2.15/day | % | social |
| `poverty_national` | Poverty headcount at national poverty lines | % | social |

## Maintenance Rule

- Do not hardcode metric lists in product docs.
- Any metric add/remove/rename in `metrics.ts` must update this file and relevant dependent docs (`VARIABLES.md`, `PRD.md`, `TRACEABILITY_MATRIX.md`).
