/**
 * Metadata for all metrics displayed in the dashboard.
 * Used by the Source tab to show description, formula, and data source.
 */

export interface MetricSource {
  name: string;
  url: string;
}

export interface MetricMetadata {
  id: string;
  label: string;
  description: string;
  formula?: string;
  unit: string;
  sources: MetricSource[];
  category: 'financial' | 'population' | 'health' | 'geography';
}

const WORLD_BANK_WDI = 'World Bank WDI';
const WORLD_BANK_WDI_BASE = 'https://data.worldbank.org/indicator';
const IMF_WEO = 'IMF World Economic Outlook';
const IMF_DATAMAPPER = 'https://www.imf.org/external/datamapper';

export const METRIC_METADATA: MetricMetadata[] = [
  // Financial – GDP
  {
    id: 'gdpNominal',
    label: 'GDP (Nominal, US$)',
    description:
      'Gross domestic product at market prices, converted to current U.S. dollars using official exchange rates. Measures the total value of goods and services produced within a country.',
    formula: 'GDP = C + I + G + (X − M)',
    unit: 'USD',
    category: 'financial',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/NY.GDP.MKTP.CD` },
      { name: IMF_WEO, url: `${IMF_DATAMAPPER}/NGDPD@WEO` },
    ],
  },
  {
    id: 'gdpPPP',
    label: 'GDP (PPP, Intl$)',
    description:
      'Gross domestic product converted to international dollars using purchasing power parity (PPP) rates. Allows comparison of living standards across countries.',
    formula: 'GDP (PPP) = GDP × PPP conversion factor',
    unit: 'Intl$',
    category: 'financial',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/NY.GDP.MKTP.PP.CD` }],
  },
  {
    id: 'gdpNominalPerCapita',
    label: 'GDP per Capita (Nominal, US$)',
    description:
      'GDP divided by midyear population. Indicates average economic output per person in current U.S. dollars.',
    formula: 'GDP per capita = GDP / Population',
    unit: 'USD',
    category: 'financial',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/NY.GDP.PCAP.CD` }],
  },
  {
    id: 'gdpPPPPerCapita',
    label: 'GDP per Capita (PPP, Intl$)',
    description:
      'GDP (PPP) divided by population. Reflects average purchasing power per person across countries.',
    formula: 'GDP per capita (PPP) = GDP (PPP) / Population',
    unit: 'Intl$',
    category: 'financial',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/NY.GDP.PCAP.PP.CD` }],
  },
  // Financial – Inflation & rates
  {
    id: 'inflationCPI',
    label: 'Inflation (CPI, %)',
    description:
      'Annual percentage change in the consumer price index (CPI). Measures the rate at which prices of a basket of consumer goods and services change over time.',
    formula: 'Inflation = ((CPI_t − CPI_{t−1}) / CPI_{t−1}) × 100',
    unit: '%',
    category: 'financial',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/FP.CPI.TOTL.ZG` }],
  },
  {
    id: 'unemploymentRate',
    label: 'Unemployment rate (% of labour force)',
    description:
      'Unemployment, total (% of total labour force), modelled estimate based on International Labour Organization (ILO) methodology. Measures the share of the labour force that is without work but available for and seeking employment.',
    formula:
      'Unemployment rate = (Number of unemployed persons / Total labour force) × 100',
    unit: '% of labour force',
    category: 'financial',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SL.UEM.TOTL.ZS` }],
  },
  {
    id: 'unemployedTotal',
    label: 'Unemployed (number of people)',
    description:
      'Total number of people without work but available for and seeking employment. Modeled ILO estimate from the World Bank WDI. Aligned with ILO definitions and UN population data.',
    formula: 'Unemployed = Labour force × (Unemployment rate / 100); or directly from ILO-modelled estimates',
    unit: 'People',
    category: 'financial',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SL.UEM.TOTL` },
      { name: 'ILO (via World Bank)', url: 'https://ilostat.ilo.org/' },
    ],
  },
  {
    id: 'labourForceTotal',
    label: 'Labour force (total)',
    description:
      'Total labour force: people ages 15 and older who supply labour for the production of goods and services. Includes employed and unemployed persons seeking work. Based on ILO methodology and UN Population Division data via World Bank WDI.',
    formula: 'Labour force = Employed + Unemployed (seeking work)',
    unit: 'People',
    category: 'financial',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SL.TLF.TOTL.IN` },
      { name: 'ILO / UN (via World Bank)', url: 'https://ilostat.ilo.org/' },
    ],
  },
  {
    id: 'interestRate',
    label: 'Lending interest rate (%)',
    description:
      'The rate charged by banks on loans to prime customers. Reflects the cost of borrowing and monetary policy stance.',
    formula: 'Reported as annual average of bank lending rates',
    unit: '%',
    category: 'financial',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/FR.INR.LEND` }],
  },
  // Financial – Poverty (World Bank WDI)
  {
    id: 'povertyHeadcount215',
    label: 'Poverty headcount ($2.15/day, %)',
    description:
      'Percentage of population living below the international poverty line of $2.15 a day (2017 PPP). Extreme poverty measure aligned with UN SDGs and World Bank goals.',
    formula: 'Share of population with consumption or income below $2.15/day (2017 PPP)',
    unit: '% of population',
    category: 'financial',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SI.POV.DDAY` }],
  },
  {
    id: 'povertyHeadcountNational',
    label: 'Poverty headcount (national line, %)',
    description:
      'Percentage of population living below the national poverty line. Each country defines its own poverty threshold based on local costs of living.',
    formula: 'Share of population below country-specific poverty line',
    unit: '% of population',
    category: 'financial',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SI.POV.NAHC` }],
  },
  // Financial – Government debt
  {
    id: 'govDebtPercentGDP',
    label: 'Government debt (% of GDP)',
    description:
      'General government gross debt as a percentage of GDP. Measures the government\'s total debt relative to the size of the economy.',
    formula: 'Gov. debt (% GDP) = (Total government debt / GDP) × 100',
    unit: '% of GDP',
    category: 'financial',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/GC.DOD.TOTL.GD.ZS` },
      { name: IMF_WEO, url: `${IMF_DATAMAPPER}/GGXWDG_NGDP@WEO` },
    ],
  },
  {
    id: 'govDebtUSD',
    label: 'Government debt (USD)',
    description:
      'Total government gross debt in current U.S. dollars. Derived from GDP and government debt as percentage of GDP.',
    formula: 'Gov. debt (USD) = GDP × (Gov. debt % GDP / 100)',
    unit: 'USD',
    category: 'financial',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/NY.GDP.MKTP.CD` },
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/GC.DOD.TOTL.GD.ZS` },
      { name: IMF_WEO, url: `${IMF_DATAMAPPER}/GGXWDG_NGDP@WEO` },
    ],
  },
  // Population
  {
    id: 'populationTotal',
    label: 'Population, total',
    description:
      'Total population based on the de facto definition, which counts all residents regardless of legal status or citizenship.',
    formula: 'Census and intercensal estimates; UN projections',
    unit: 'People',
    category: 'population',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SP.POP.TOTL` }],
  },
  {
    id: 'pop0_14Share',
    label: 'Population 0–14 (% of total)',
    description:
      'Percentage of total population aged 0 to 14 years. Part of the youth dependency ratio.',
    formula: 'Pop 0–14 % = (Population aged 0–14 / Total population) × 100',
    unit: '% of population',
    category: 'population',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SP.POP.0014.TO.ZS` }],
  },
  {
    id: 'pop15_64Share',
    label: 'Population 15–64 (% of total)',
    description:
      'Percentage of total population aged 15 to 64 years. Represents the working-age population.',
    formula: 'Pop 15–64 % = (Population aged 15–64 / Total population) × 100',
    unit: '% of population',
    category: 'population',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SP.POP.1564.TO.ZS` }],
  },
  {
    id: 'pop65PlusShare',
    label: 'Population 65+ (% of total)',
    description:
      'Percentage of total population aged 65 years and above. Part of the old-age dependency ratio.',
    formula: 'Pop 65+ % = (Population aged 65+ / Total population) × 100',
    unit: '% of population',
    category: 'population',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SP.POP.65UP.TO.ZS` }],
  },
  // Health
  {
    id: 'lifeExpectancy',
    label: 'Life expectancy at birth',
    description:
      'Number of years a newborn would live if prevailing patterns of mortality at birth were to stay the same throughout life.',
    formula: 'Period life expectancy from mortality tables',
    unit: 'Years',
    category: 'health',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SP.DYN.LE00.IN` }],
  },
  {
    id: 'maternalMortalityRatio',
    label: 'Maternal mortality ratio (per 100,000 live births)',
    description:
      'Number of women who die from pregnancy-related causes while pregnant or within 42 days of pregnancy termination, per 100,000 live births. Aligned with SDG 3.1 and estimated jointly by WHO, UNICEF, UNFPA, the World Bank and UN DESA Population Division.',
    formula:
      'Maternal mortality ratio = (Number of maternal deaths / Number of live births) × 100,000',
    unit: 'Per 100,000 live births',
    category: 'health',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SH.STA.MMRT` }],
  },
  {
    id: 'under5MortalityRate',
    label: 'Under-5 mortality rate (per 1,000 live births)',
    description:
      'Probability per 1,000 that a newborn baby will die before reaching age five, if subject to current age-specific mortality rates. Estimated by the UN Inter-agency Group for Child Mortality Estimation (UNICEF, WHO, World Bank, UN DESA).',
    formula:
      'Under-5 mortality rate = Probability of dying between birth and exact age five, expressed per 1,000 live births',
    unit: 'Per 1,000 live births',
    category: 'health',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SH.DYN.MORT` }],
  },
  {
    id: 'undernourishmentPrevalence',
    label: 'Prevalence of undernourishment (% of population)',
    description:
      'Share of the population whose habitual food consumption is insufficient to provide the dietary energy levels required to maintain a normal active and healthy life. SDG indicator 2.1.1 produced by FAO, widely used as a headline malnutrition indicator.',
    formula:
      'Prevalence of undernourishment = Population with insufficient dietary energy intake / Total population × 100',
    unit: '% of population',
    category: 'health',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SN.ITK.DEFC.ZS` }],
  },
  // Geography
  {
    id: 'landAreaKm2',
    label: 'Land area',
    description:
      'Total land area in square kilometers, excluding area under inland water bodies, national claims to continental shelf, and exclusive economic zones.',
    formula: 'Sum of land surface areas',
    unit: 'km²',
    category: 'geography',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/AG.LND.TOTL.K2` }],
  },
  {
    id: 'totalAreaKm2',
    label: 'Total area',
    description:
      'Total surface area including land and water bodies within international boundaries and coastlines.',
    formula: 'Land area + inland water bodies',
    unit: 'km²',
    category: 'geography',
    sources: [{ name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/AG.SRF.TOTL.K2` }],
  },
  {
    id: 'eezKm2',
    label: 'Exclusive Economic Zone (EEZ)',
    description:
      'Marine area extending 200 nautical miles from the coast over which a country has special rights regarding exploration and use of marine resources.',
    formula: 'Defined by UN Convention on the Law of the Sea',
    unit: 'km²',
    category: 'geography',
    sources: [
      {
        name: 'Sea Around Us',
        url: 'https://www.searoundus.org/',
      },
      {
        name: 'Marine Regions',
        url: 'https://www.marineregions.org/',
      },
    ],
  },
];
