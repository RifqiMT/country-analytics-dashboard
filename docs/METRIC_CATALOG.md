# Metric Catalog

Canonical source: `backend/src/metrics.ts`

## Summary

- Total metrics: **59**
- Domains: general, financial, health, education, labour, social

## Core metric examples

| Metric ID | Friendly Name | Unit | Category | Typical Use |
| --- | --- | --- | --- | --- |
| `gdp` | GDP (Nominal) | US$ | financial | Country size context |
| `gdp_per_capita` | GDP per capita | US$ | financial | Income benchmark |
| `gni_per_capita_atlas` | GNI per capita (Atlas) | US$ | financial | Income-level context |
| `population` | Population | people | general | Scale denominator |
| `life_expectancy` | Life expectancy | years | health | Health outcome |
| `health_expenditure_gdp` | Health spend (% GDP) | % | health | Health investment context |

## Beginner tips

- Always check unit and year before comparing values.
- Do not assume missing values mean zero.
