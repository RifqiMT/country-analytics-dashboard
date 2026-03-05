# Product Metrics Documentation

This document provides a comprehensive reference for all **data metrics** displayed in the Country Analytics Platform. For engagement metrics and OKRs, see `METRICS_AND_OKRS.md`.

---

## 1. Product Logic (How Metrics Feed the UI)

The same data metrics are used across the product in different ways:

- **Country dashboard**: Summary cards (latest values + YoY), unified time-series (core structural metrics), macro indicators timeline (economic & financial and health, separate sections), unemployed & labour force timeline, **Population Structure** timeline (age-group shares and absolute counts over time), and country comparison table.
- **Global analytics**: Choropleth map (one metric per view; zoom; hover with flag on shape), global tables (General, Financial, Health & demographics with YoY). Correlation scatter (X/Y metrics) lives in the **Business Analytics** tab.
- **Business Analytics**: Correlation scatter uses two metrics from the global dataset; correlation & causation analysis (Pearson r, p-value) is computed from the same metrics.
- **Source tab**: Each metric is documented with label, description, formula, unit, and source links; metadata comes from `src/data/metricMetadata.ts`. Categories: Financial, Population, Health, Geography, **Country metadata & context** (region, income level, government type, head of government, capital, currency). Section "Where metrics and information appear" describes usage across Country Dashboard, Global view, PESTEL, Business Analytics, and Analytics Assistant.
- **Analytics assistant & PESTEL**: Use country context and global data (including these metrics) for answers and PESTEL generation.

---

## 2. Metric Categories

| Category | Metrics | Primary Source |
|----------|---------|----------------|
| **Financial** | GDP, Government debt, Inflation, Interest rate, Unemployment, Poverty headcount | World Bank WDI, IMF WEO |
| **Population** | Total, Age groups (0–14, 15–64, 65+) | World Bank WDI |
| **Health** | Life expectancy, Maternal mortality, Under‑5 mortality, Prevalence of undernourishment | World Bank WDI (WHO/UN/FAO sourced) |
| **Geography** | Land area, Total area, EEZ | World Bank WDI, Sea Around Us, Marine Regions |
| **Context / metadata** | Region, Income level, Government type, Head of government, Capital, Currency | World Bank, REST Countries |

---

## 3. Financial Metrics

| Metric ID | Label | Unit | Formula | Fallback |
|-----------|-------|------|---------|----------|
| `gdpNominal` | GDP (Nominal, US$) | USD | GDP = C + I + G + (X − M) | IMF NGDPD |
| `gdpPPP` | GDP (PPP, Intl$) | Intl$ | GDP (PPP) = GDP × PPP factor | — |
| `gdpNominalPerCapita` | GDP per Capita (Nominal) | USD | GDP / Population | — |
| `gdpPPPPerCapita` | GDP per Capita (PPP) | Intl$ | GDP (PPP) / Population | — |
| `govDebtUSD` | Government debt (USD) | USD | GDP × (Gov. debt % GDP / 100) | IMF for components |
| `govDebtPercentGDP` | Government debt (% of GDP) | % of GDP | (Total gov. debt / GDP) × 100 | IMF WEO (when World Bank empty) |
| `inflationCPI` | Inflation (CPI, %) | % | ((CPI_t − CPI_{t−1}) / CPI_{t−1}) × 100 | Parent country (territories) |
| `interestRate` | Lending interest rate (%) | % | Bank lending rate | Parent country (territories) |
| `unemploymentRate` | Unemployment rate (% of labour force) | % of labour force | (Number of unemployed / Labour force) × 100 | — (modelled ILO estimate via WDI) |
| `povertyHeadcount215` | Poverty headcount ($2.15/day, %) | % of population | Share of population with consumption or income below $2.15/day (2017 PPP) | — |
| `povertyHeadcountNational` | Poverty headcount (national line, %) | % of population | Share of population below country-specific national poverty line | — |

---

## 4. Population Metrics

| Metric ID | Label | Unit | Formula |
|-----------|-------|------|---------|
| `populationTotal` | Population, total | People | Census and intercensal estimates |
| `pop0_14Share` | Population 0–14 (% of total) | % | (Pop 0–14 / Total) × 100 |
| `pop15_64Share` | Population 15–64 (% of total) | % | (Pop 15–64 / Total) × 100 |
| `pop65PlusShare` | Population 65+ (% of total) | % | (Pop 65+ / Total) × 100 |

**Derived:** Absolute counts = Total × (Share / 100). The **Population Structure** section in the Country Dashboard shows these shares and derived absolute counts over time (with frequency and chart/table view).

---

## 5. Health Metrics

| Metric ID | Label | Unit | Formula |
|-----------|-------|------|---------|
| `lifeExpectancy` | Life expectancy at birth | Years | Period life expectancy from mortality tables |
| `maternalMortalityRatio` | Maternal mortality ratio | Per 100,000 live births | (Number of maternal deaths / Number of live births) × 100,000 |
| `under5MortalityRate` | Under‑5 mortality rate | Per 1,000 live births | Probability of dying between birth and exact age five, expressed per 1,000 live births |
| `undernourishmentPrevalence` | Prevalence of undernourishment | % of population | Population with insufficient dietary energy intake / Total population × 100 |

---

## 6. Geography Metrics

| Metric ID | Label | Unit | Source |
|-----------|-------|------|--------|
| `landAreaKm2` | Land area | km² | World Bank WDI |
| `totalAreaKm2` | Total area | km² | World Bank WDI |
| `eezKm2` | Exclusive Economic Zone | km² | Sea Around Us, Marine Regions |

---

## 7. Government & Context Metrics (Map, Tables, Source)

| Metric ID | Label | Type | Source |
|-----------|-------|------|--------|
| `governmentType` | Government type | Categorical | REST Countries |
| `headOfGovernmentType` | Head of government | Categorical | REST Countries |
| `region` | Region | Categorical | World Bank, REST Countries |
| `incomeLevel` | Income level | Categorical | World Bank |
| `capitalCity` | Capital city | Categorical | World Bank, REST Countries |
| `currency` | Currency | Categorical | REST Countries |

These are documented in the Source tab under **Country metadata & context** and in `src/data/metricMetadata.ts`.

---

## 8. World Bank Indicator Codes

| Metric | WDI Code |
|--------|----------|
| GDP (current US$) | NY.GDP.MKTP.CD |
| GDP, PPP | NY.GDP.MKTP.PP.CD |
| GDP per capita (current US$) | NY.GDP.PCAP.CD |
| GDP per capita, PPP | NY.GDP.PCAP.PP.CD |
| Inflation, consumer prices | FP.CPI.TOTL.ZG |
| Central government debt (% of GDP) | GC.DOD.TOTL.GD.ZS |
| Lending interest rate | FR.INR.LEND |
| Unemployment, total (% of total labour force) | SL.UEM.TOTL.ZS |
| Poverty headcount ratio at $2.15 a day (2017 PPP) (% of population) | SI.POV.DDAY |
| Poverty headcount ratio at national poverty lines (% of population) | SI.POV.NAHC |
| Population, total | SP.POP.TOTL |
| Population 0–14 (% of total) | SP.POP.0014.TO.ZS |
| Population 15–64 (% of total) | SP.POP.1564.TO.ZS |
| Population 65+ (% of total) | SP.POP.65UP.TO.ZS |
| Life expectancy at birth | SP.DYN.LE00.IN |
| Maternal mortality ratio (modeled estimate, per 100,000 live births) | SH.STA.MMRT |
| Mortality rate, under‑5 (per 1,000 live births) | SH.DYN.MORT |
| Prevalence of undernourishment (% of population) | SN.ITK.DEFC.ZS |
| Land area | AG.LND.TOTL.K2 |
| Surface area | AG.SRF.TOTL.K2 |

---

## 9. Data Quality Rules

- **Latest non-null**: Dashboard uses latest non-null value up to selected end year
- **Year fallback**: Global loader steps backwards when a year has no data
- **Territory fallback**: 30+ territories use parent country for inflation/interest
- **IMF fallback**: Gov debt and GDP when World Bank returns empty
- **Missing display**: "–" for null; no NaN or broken charts

---

## 10. Source Tab Reference

The **Source** tab provides:

- **Where metrics and information appear** – Describes how data is used in Country Dashboard, Global view (map & table), PESTEL, Business Analytics, and Analytics Assistant
- **Analytics Assistant flow** – Documents year-based routing: Groq for period ≤ current year − 2, Tavily for recent/current; Tavily Web Search selectable
- **Per-metric documentation** – Full description, formula, unit, data source links. Categories: Financial, Population, Health, Geography, **Country metadata & context** (region, income level, government type, head of government, capital, currency)
- **Search and filter** – By metric name, description, formula, or source; filter chips: World Bank, IMF, REST Countries, Sea Around Us, Marine Regions, ILO, WHO, UN, FAO

Metadata is defined in `src/data/metricMetadata.ts`. All metrics above (including context) are in `metricMetadata.ts` for the Source tab.
