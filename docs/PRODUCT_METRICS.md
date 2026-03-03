# Product Metrics Documentation

This document provides a comprehensive reference for all **data metrics** displayed in the Country Analytics Platform. For engagement metrics and OKRs, see `METRICS_AND_OKRS.md`.

---

## 1. Metric Categories

| Category | Metrics | Primary Source |
|----------|---------|----------------|
| **Financial** | GDP, Gov. debt, Inflation, Interest rate | World Bank WDI, IMF WEO |
| **Population** | Total, Age groups (0–14, 15–64, 65+) | World Bank WDI |
| **Health** | Life expectancy | World Bank WDI |
| **Geography** | Land area, Total area, EEZ | World Bank WDI, Sea Around Us |

---

## 2. Financial Metrics

| Metric ID | Label | Unit | Formula | Fallback |
|-----------|-------|------|---------|----------|
| `gdpNominal` | GDP (Nominal, US$) | USD | GDP = C + I + G + (X − M) | IMF NGDPD |
| `gdpPPP` | GDP (PPP, Intl$) | Intl$ | GDP (PPP) = GDP × PPP factor | — |
| `gdpNominalPerCapita` | GDP per Capita (Nominal) | USD | GDP / Population | — |
| `gdpPPPPerCapita` | GDP per Capita (PPP) | Intl$ | GDP (PPP) / Population | — |
| `govDebtUSD` | Government debt (USD) | USD | GDP × (Gov. debt % GDP / 100) | IMF for components |
| `govDebtPercentGDP` | Government debt (% of GDP) | % of GDP | (Total gov. debt / GDP) × 100 | IMF WEO |
| `inflationCPI` | Inflation (CPI, %) | % | ((CPI_t − CPI_{t−1}) / CPI_{t−1}) × 100 | Parent country (territories) |
| `interestRate` | Lending interest rate (%) | % | Bank lending rate | Parent country (territories) |

---

## 3. Population Metrics

| Metric ID | Label | Unit | Formula |
|-----------|-------|------|---------|
| `populationTotal` | Population, total | People | Census and intercensal estimates |
| `pop0_14Share` | Population 0–14 (% of total) | % | (Pop 0–14 / Total) × 100 |
| `pop15_64Share` | Population 15–64 (% of total) | % | (Pop 15–64 / Total) × 100 |
| `pop65PlusShare` | Population 65+ (% of total) | % | (Pop 65+ / Total) × 100 |

**Derived:** Absolute counts = Total × (Share / 100)

---

## 4. Health Metrics

| Metric ID | Label | Unit | Formula |
|-----------|-------|------|---------|
| `lifeExpectancy` | Life expectancy at birth | Years | Period life expectancy from mortality tables |

---

## 5. Geography Metrics

| Metric ID | Label | Unit | Source |
|-----------|-------|------|--------|
| `landAreaKm2` | Land area | km² | World Bank WDI |
| `totalAreaKm2` | Total area | km² | World Bank WDI |
| `eezKm2` | Exclusive Economic Zone | km² | Sea Around Us, Marine Regions |

---

## 6. Government Metrics (Map & Tables)

| Metric ID | Label | Type | Source |
|-----------|-------|------|--------|
| `governmentType` | Government type | Categorical | Inferred from REST Countries |
| `headOfGovernmentType` | Head of government | Categorical | Inferred from REST Countries |
| `region` | Region | Categorical | World Bank |

---

## 7. World Bank Indicator Codes

| Metric | WDI Code |
|--------|----------|
| GDP (current US$) | NY.GDP.MKTP.CD |
| GDP, PPP | NY.GDP.MKTP.PP.CD |
| GDP per capita (current US$) | NY.GDP.PCAP.CD |
| GDP per capita, PPP | NY.GDP.PCAP.PP.CD |
| Inflation, consumer prices | FP.CPI.TOTL.ZG |
| Central government debt (% of GDP) | GC.DOD.TOTL.GD.ZS |
| Lending interest rate | FR.INR.LEND |
| Population, total | SP.POP.TOTL |
| Population 0–14 (% of total) | SP.POP.0014.TO.ZS |
| Population 15–64 (% of total) | SP.POP.1564.TO.ZS |
| Population 65+ (% of total) | SP.POP.65UP.TO.ZS |
| Life expectancy at birth | SP.DYN.LE00.IN |
| Land area | AG.LND.TOTL.K2 |
| Surface area | AG.SRF.TOTL.K2 |

---

## 8. Data Quality Rules

- **Latest non-null**: Dashboard uses latest non-null value up to selected end year
- **Year fallback**: Global loader steps backwards when a year has no data
- **Territory fallback**: 30+ territories use parent country for inflation/interest
- **IMF fallback**: Gov debt and GDP when World Bank returns empty
- **Missing display**: "–" for null; no NaN or broken charts

---

## 9. Source Tab Reference

The **Source** tab provides per-metric documentation including:

- Full description
- Formula
- Unit
- Data source links (World Bank, IMF, Sea Around Us, Marine Regions)

Metadata is defined in `src/data/metricMetadata.ts`.
