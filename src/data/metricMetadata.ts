/**
 * Metadata for all metrics and variables displayed or used across the platform.
 * Used by the Source tab to show description, formula, unit, and links to credible data sources.
 * Kept up to date with current definitions and official indicator/source URLs.
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
  category: 'financial' | 'population' | 'health' | 'geography' | 'context' | 'education';
  /** When category is 'education', used to group metrics in Source tab and align with standard level/type taxonomy. */
  educationSubcategory?: 'early_childhood' | 'primary' | 'secondary' | 'tertiary' | 'literacy_attainment' | 'equity_quality_investment';
}

const WORLD_BANK_WDI = 'World Bank WDI';
const WORLD_BANK_WDI_BASE = 'https://data.worldbank.org/indicator';
const WORLD_BANK_COUNTRY = 'https://data.worldbank.org/country';
const IMF_WEO = 'IMF World Economic Outlook';
const IMF_DATAMAPPER = 'https://www.imf.org/external/datamapper';
const REST_COUNTRIES = 'https://restcountries.com';
const UNESCO_UIS = 'UNESCO Institute for Statistics';
const UNESCO_UIS_URL = 'http://data.uis.unesco.org/';

/** Labels for education subcategories used in the Source tab and documentation. */
export const EDUCATION_SUBCATEGORY_LABELS: Record<NonNullable<MetricMetadata['educationSubcategory']>, string> = {
  early_childhood: 'Early childhood',
  primary: 'Primary education',
  secondary: 'Secondary education',
  tertiary: 'Tertiary education',
  literacy_attainment: 'Literacy & attainment',
  equity_quality_investment: 'Quality, equity & investment',
};

/** Display order for education subcategories in the Source tab. */
export const EDUCATION_SUBCATEGORY_ORDER: NonNullable<MetricMetadata['educationSubcategory']>[] = [
  'early_childhood',
  'primary',
  'secondary',
  'tertiary',
  'literacy_attainment',
  'equity_quality_investment',
];

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
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SH.STA.MMRT` },
      { name: 'WHO', url: 'https://www.who.int/data/gho/indicator-metadata-registry/imr-details/26' },
    ],
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
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SH.DYN.MORT` },
      { name: 'WHO / UNICEF / UN (child mortality)', url: 'https://childmortality.org/' },
    ],
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
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SN.ITK.DEFC.ZS` },
      { name: 'FAO', url: 'https://www.fao.org/sustainable-development-goals/indicators/211/en/' },
    ],
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
  // Population – derived (displayed in Population Structure section)
  {
    id: 'populationByAgeAbsolute',
    label: 'Population by age group (absolute count)',
    description:
      'Absolute number of people in each age band (0–14, 15–64, 65+). Derived in the dashboard from total population and the age-group share of total. Shown in the Population Structure section alongside the percentage share.',
    formula: 'Population age group = Total population × (Age-group share % / 100)',
    unit: 'People',
    category: 'population',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SP.POP.TOTL` },
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SP.POP.0014.TO.ZS` },
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SP.POP.1564.TO.ZS` },
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SP.POP.65UP.TO.ZS` },
    ],
  },
  // Context – country metadata (used in Summary, Map, Tables, Chat, PESTEL)
  {
    id: 'region',
    label: 'Region',
    description:
      'Geographic or economic region of the country (e.g. East Asia & Pacific, Sub-Saharan Africa). Used for filtering, peer comparison, and PESTEL. World Bank regional classification; REST Countries provides complementary region data.',
    formula: 'World Bank regional classification',
    unit: '—',
    category: 'context',
    sources: [
      { name: 'World Bank – country data', url: WORLD_BANK_COUNTRY },
      { name: 'REST Countries API', url: REST_COUNTRIES },
    ],
  },
  {
    id: 'incomeLevel',
    label: 'Income level',
    description:
      'World Bank income classification (e.g. High income, Upper middle income, Low income). Based on GNI per capita; updated annually. Used in summary cards and analytics.',
    formula: 'World Bank analytical classification (GNI per capita)',
    unit: '—',
    category: 'context',
    sources: [
      { name: 'World Bank – country and lending groups', url: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/906519-world-bank-country-and-lending-groups' },
      { name: 'World Bank – country data', url: WORLD_BANK_COUNTRY },
    ],
  },
  {
    id: 'governmentType',
    label: 'Government type',
    description:
      'Form of government or political system (e.g. Federal republic, Parliamentary democracy). Shown in Summary, Map metric selector, and Global table. Sourced from REST Countries API.',
    formula: '—',
    unit: '—',
    category: 'context',
    sources: [{ name: 'REST Countries API', url: REST_COUNTRIES }],
  },
  {
    id: 'headOfGovernmentType',
    label: 'Head of government',
    description:
      'Title of the chief executive (e.g. President, Prime Minister, Monarch). Used in country context for the Analytics Assistant and PESTEL. Sourced from REST Countries API.',
    formula: '—',
    unit: '—',
    category: 'context',
    sources: [{ name: 'REST Countries API', url: REST_COUNTRIES }],
  },
  {
    id: 'capitalCity',
    label: 'Capital city',
    description:
      'Capital or seat of government. Shown in country metadata and used in context for the Analytics Assistant and PESTEL. World Bank and REST Countries both provide capital data.',
    formula: '—',
    unit: '—',
    category: 'context',
    sources: [
      { name: 'World Bank – urban population', url: `${WORLD_BANK_WDI_BASE}/EN.URB.LCTY` },
      { name: 'REST Countries API', url: REST_COUNTRIES },
    ],
  },
  {
    id: 'currency',
    label: 'Currency',
    description:
      'Official currency: name, ISO code (e.g. IDR, USD), and symbol where available. Shown in country summary and used in context for the Analytics Assistant and PESTEL. Sourced from REST Countries API.',
    formula: '—',
    unit: '—',
    category: 'context',
    sources: [
      { name: 'REST Countries API', url: REST_COUNTRIES },
      { name: 'REST Countries – currencies', url: 'https://restcountries.com/v3.1/field/currencies' },
    ],
  },
  {
    id: 'timezone',
    label: 'Timezone',
    description:
      'Primary timezone of the country (e.g. Asia/Jakarta, Europe/Paris). Used in country summary and context. Sourced from REST Countries API (IANA timezone database).',
    formula: '—',
    unit: '—',
    category: 'context',
    sources: [
      { name: 'REST Countries API', url: REST_COUNTRIES },
      { name: 'IANA Time Zone Database', url: 'https://www.iana.org/time-zones' },
    ],
  },
  {
    id: 'locationAndGeography',
    label: 'Location & geographic context',
    description:
      'Where a country is located, which continent or region it belongs to, and its neighbouring or bordering countries. Not stored as a dashboard metric; answered by the Analytics Assistant using the LLM and web search (e.g. Wikipedia, CIA World Factbook) when users ask questions like "Where is Indonesia located?" or "Which countries border France?".',
    formula: '—',
    unit: '—',
    category: 'context',
    sources: [
      { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' },
      { name: 'CIA World Factbook', url: 'https://www.cia.gov/the-world-factbook/' },
    ],
  },
  // ─── Education – UNESCO UIS / World Bank WDI (2000 to latest). Grouped by level and type.
  // Primary education
  {
    id: 'outOfSchoolPrimaryPct',
    label: 'Out-of-school rate (primary, % of primary school age)',
    description:
      'Percentage of children of primary school age who are not enrolled in primary or secondary school. Derived as 100 minus the primary net enrollment rate. Aligned with SDG 4.1.2 and UNESCO UIS methodology.',
    formula: 'Out-of-school rate (primary) = 100 − Primary net enrollment rate (%)',
    unit: '% of primary school age',
    category: 'education',
    educationSubcategory: 'primary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.PRM.NENR` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'outOfSchoolSecondaryPct',
    label: 'Out-of-school rate (secondary, % of secondary school age)',
    description:
      'Percentage of children of official secondary school age who are not enrolled in secondary or tertiary education. Derived as 100 minus the secondary net enrollment rate. Sourced from UNESCO UIS via World Bank WDI (SE.SEC.NENR).',
    formula: 'Out-of-school rate (secondary) = 100 − Secondary net enrollment rate (%)',
    unit: '% of secondary school age',
    category: 'education',
    educationSubcategory: 'secondary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.SEC.NENR` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'outOfSchoolTertiaryPct',
    label: 'Out-of-school rate (tertiary, %)',
    description:
      'Approximate share of the official tertiary education age group not enrolled in tertiary education. Derived as 100 minus the tertiary gross enrollment ratio (capped at 100). WDI does not report tertiary net enrollment; this proxy uses gross enrollment. Sourced from UNESCO UIS via World Bank WDI (SE.TER.ENRR).',
    formula: 'Out-of-school rate (tertiary) = max(0, 100 − Tertiary gross enrollment ratio (%))',
    unit: '%',
    category: 'education',
    educationSubcategory: 'tertiary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.TER.ENRR` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'primaryCompletionRate',
    label: 'Primary completion rate (gross, % of relevant age group)',
    description:
      'Primary completion rate: gross intake ratio to the last grade of primary education, as a percentage of the population at the official completion age. It is a gross ratio (completers can include overage and underage students), so values can exceed 100%. Sourced from UNESCO UIS via World Bank WDI (SE.PRM.CMPT.ZS).',
    formula: 'Primary completion rate (gross) = (New entrants in last grade of primary / Population at completion age) × 100',
    unit: '% of relevant age group',
    category: 'education',
    educationSubcategory: 'primary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.PRM.CMPT.ZS` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'secondaryCompletionRate',
    label: 'Secondary completion rate (gross, % of relevant age group)',
    description:
      'Lower secondary completion rate: gross intake ratio to the last grade of lower secondary education, as a percentage of the population at the entrance age for that grade. It is a gross ratio (completers can include overage and underage students), so values can exceed 100%. Sourced from UNESCO UIS via World Bank WDI (SE.SEC.CMPT.LO.ZS).',
    formula: 'Secondary completion rate (gross) = (New entrants in last grade of lower secondary / Population at entrance age) × 100',
    unit: '% of relevant age group',
    category: 'education',
    educationSubcategory: 'secondary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.SEC.CMPT.LO.ZS` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'tertiaryCompletionRate',
    label: 'Tertiary completion rate (gross, %)',
    description:
      'Gross graduation ratio for tertiary education: number of graduates from first degree programmes (ISCED 6 and 7) as a percentage of the population of the theoretical graduation age. It is a gross ratio (graduates can include overage students), so values can exceed 100%. Sourced from UNESCO UIS via World Bank WDI (SE.TER.CMPL.ZS).',
    formula: 'Tertiary completion (graduation) rate (gross) = (Graduates from first degree programmes / Population of theoretical graduation age) × 100',
    unit: '%',
    category: 'education',
    educationSubcategory: 'tertiary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.TER.CMPL.ZS` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'minProficiencyReadingPct',
    label: 'Minimum reading proficiency (% of children at end of primary)',
    description:
      'Percentage of children at the end of primary education who achieve at least a minimum proficiency level in reading. Derived as 100 minus the learning poverty indicator (share below minimum proficiency). Aligned with SDG 4.1.1 and World Bank learning poverty methodology.',
    formula: 'Minimum reading proficiency (%) = 100 − Learning poverty (% below minimum proficiency)',
    unit: '%',
    category: 'education',
    educationSubcategory: 'primary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.LPV.PRIM` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'primaryPupilsTotal',
    label: 'Primary enrollment (total)',
    description:
      'Total number of pupils enrolled at primary level in public and private schools. Includes all individuals officially registered in primary education regardless of age. Sourced from UNESCO Institute for Statistics via World Bank WDI. Supports SDG 4 and cross-country comparison of education scale.',
    formula: 'Sum of primary-level enrollment across all institutions.',
    unit: 'Students',
    category: 'education',
    educationSubcategory: 'primary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.PRM.ENRL` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'primaryEnrollmentPct',
    label: 'School enrollment, primary (% gross)',
    description:
      'Gross enrollment ratio for primary education: total enrollment in primary education regardless of age, expressed as a percentage of the population of the official primary education age group. Supports SDG 4 and cross-country comparison of primary access.',
    formula: 'Primary gross enrollment = (Total enrollment in primary / Population of official primary age) × 100',
    unit: '% gross',
    category: 'education',
    educationSubcategory: 'primary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.PRM.ENRR` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'primarySchoolsTotal',
    label: 'Primary education, teachers (total)',
    description:
      'Number of teachers in primary education (both sexes). Sourced from UNESCO Institute for Statistics via World Bank WDI (SE.PRM.TCHR). Data from 2000 to latest available. Used as a proxy for primary education system size when school counts are not consistently reported.',
    formula: 'Count of teachers in primary education (ISCED 1).',
    unit: 'Teachers',
    category: 'education',
    educationSubcategory: 'primary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.PRM.TCHR` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'primarySchoolCount',
    label: 'Number of primary schools (estimated)',
    description:
      'Estimated number of primary education institutions (schools) offering ISCED level 1 programmes. This metric is derived from total primary enrollment (UNESCO UIS via World Bank WDI) using a typical average school size and is not an official UIS “number of schools” indicator. Intended for high-level system-size comparisons when direct institution-count data is not available via public APIs.',
    formula: 'Estimated primary schools = Total primary pupils (SE.PRM.ENRL) ÷ 250 (assumed pupils per primary school).',
    unit: 'Schools',
    category: 'education',
    educationSubcategory: 'primary',
    sources: [
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
      { name: 'World Bank – Education Statistics', url: 'https://data.worldbank.org/topic/education' },
      { name: 'UN SDG 4', url: 'https://sdg4-data.uis.unesco.org/' },
    ],
  },
  // Secondary education
  {
    id: 'secondaryPupilsTotal',
    label: 'Secondary enrollment (total)',
    description:
      'Total number of pupils enrolled at secondary level (lower and upper secondary, ISCED 2 and 3) in public and private schools. Sourced from UNESCO Institute for Statistics via World Bank WDI.',
    formula: 'Sum of secondary-level enrollment across all institutions.',
    unit: 'Students',
    category: 'education',
    educationSubcategory: 'secondary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.SEC.ENRL` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'secondaryEnrollmentPct',
    label: 'School enrollment, secondary (% gross)',
    description:
      'Gross enrollment ratio for secondary education: total enrollment in secondary education regardless of age, expressed as a percentage of the population of the official secondary education age group. Supports SDG 4 and cross-country comparison of secondary access.',
    formula: 'Secondary gross enrollment = (Total enrollment in secondary / Population of official secondary age) × 100',
    unit: '% gross',
    category: 'education',
    educationSubcategory: 'secondary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.SEC.ENRR` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'secondarySchoolsTotal',
    label: 'Secondary education, teachers (total)',
    description:
      'Number of teachers in secondary education (both sexes). Sourced from UNESCO Institute for Statistics via World Bank WDI (SE.SEC.TCHR). Data from 2000 to latest available. Used as a proxy for secondary education system size when school counts are not consistently reported.',
    formula: 'Count of teachers in secondary education (ISCED 2–3).',
    unit: 'Teachers',
    category: 'education',
    educationSubcategory: 'secondary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.SEC.TCHR` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'secondarySchoolCount',
    label: 'Number of secondary schools (estimated)',
    description:
      'Estimated number of secondary education institutions (schools) offering ISCED levels 2 and 3 (lower and upper secondary). This metric is derived from total secondary enrollment (UNESCO UIS via World Bank WDI) using a typical average school size and is not an official UIS “number of schools” indicator. Intended for high-level system-size comparisons when direct institution-count data is not available via public APIs.',
    formula: 'Estimated secondary schools = Total secondary pupils (SE.SEC.ENRL) ÷ 500 (assumed pupils per secondary school).',
    unit: 'Schools',
    category: 'education',
    educationSubcategory: 'secondary',
    sources: [
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
      { name: 'World Bank – Education Statistics', url: 'https://data.worldbank.org/topic/education' },
      { name: 'UN SDG 4', url: 'https://sdg4-data.uis.unesco.org/' },
    ],
  },
  // Tertiary education
  {
    id: 'tertiaryEnrollmentPct',
    label: 'School enrollment, tertiary (% gross)',
    description:
      'Gross enrollment ratio for tertiary education: total enrollment in tertiary education regardless of age, expressed as a percentage of the population of the official tertiary education age group (typically the five-year age group following upper secondary). Supports SDG 4.3.1.',
    formula: 'Tertiary gross enrollment = (Total enrollment in tertiary / Population of official tertiary age) × 100',
    unit: '% gross',
    category: 'education',
    educationSubcategory: 'tertiary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.TER.ENRR` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'tertiaryEnrollmentTotal',
    label: 'Tertiary enrollment (total)',
    description:
      'Total number of students enrolled in tertiary education (all programmes, both sexes). Includes ISCED levels 5–8 (short-cycle tertiary, bachelor, master, doctoral). Sourced from UNESCO Institute for Statistics via World Bank WDI. Complements primary and secondary pupil counts for education scale by level.',
    formula: 'Sum of tertiary-level enrollment across all institutions.',
    unit: 'Students',
    category: 'education',
    educationSubcategory: 'tertiary',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.TER.ENRL` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'tertiaryInstitutionsTotal',
    label: 'Tertiary education, teachers (total)',
    description:
      'Number of teachers in tertiary education programmes (both sexes). Sourced from UNESCO Institute for Statistics (UIS) Data API (indicator 25003). Data from 2000 to latest available. Used as a proxy for higher education system size when institution counts are not consistently reported.',
    formula: 'Count of teachers in tertiary education (ISCED levels 5–8).',
    unit: 'Teachers',
    category: 'education',
    educationSubcategory: 'tertiary',
    sources: [
      { name: UNESCO_UIS, url: 'https://api.uis.unesco.org/api/public/documentation' },
    ],
  },
  {
    id: 'tertiaryInstitutionCount',
    label: 'Number of universities and tertiary institutions (estimated)',
    description:
      'Estimated number of tertiary education institutions (universities, colleges, and other higher education institutions) offering ISCED levels 5–8. This metric is derived from total tertiary enrollment (UNESCO UIS via World Bank WDI) using a typical average institution size and is not an official UIS “number of institutions” indicator. Intended for high-level system-size comparisons when direct institution-count data is not available via public APIs.',
    formula: 'Estimated tertiary institutions = Total tertiary students (SE.TER.ENRL) ÷ 5,000 (assumed students per institution).',
    unit: 'Institutions',
    category: 'education',
    educationSubcategory: 'tertiary',
    sources: [
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
      { name: 'World Bank – Education Statistics', url: 'https://data.worldbank.org/topic/education' },
      { name: 'UN SDG 4', url: 'https://sdg4-data.uis.unesco.org/' },
    ],
  },
  // Literacy & attainment
  {
    id: 'literacyRateAdultPct',
    label: 'Literacy rate, adult (% of people ages 15+)',
    description:
      'Percentage of the population aged 15 and above who can read and write a short, simple statement on their everyday life. Key indicator for educational attainment and SDG 4.6.1.',
    formula: 'Adult literacy rate = (Literate population aged 15+ / Total population aged 15+) × 100',
    unit: '% of people ages 15+',
    category: 'education',
    educationSubcategory: 'literacy_attainment',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.ADT.LITR.ZS` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  // Equity (gender parity)
  {
    id: 'genderParityIndexPrimary',
    label: 'Gender parity index (GPI), primary enrollment',
    description:
      'Compares how many girls versus boys are enrolled in primary school. Equal enrollment gives a value of 1 (parity). Below 1 means more boys than girls are enrolled; above 1 means more girls than boys. Used to track gender balance in education (SDG 4.5.1).',
    formula:
      'GPI = (Female gross enrollment ratio in primary education) ÷ (Male gross enrollment ratio in primary education). Gross enrollment ratio = total enrollment in that level (all ages) ÷ population of official primary-school age × 100. Data from UNESCO UIS; unit is a ratio (1 = parity). WDI may report the ratio or ratio × 100; this dashboard displays the ratio.',
    unit: 'ratio',
    category: 'education',
    educationSubcategory: 'equity_quality_investment',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.ENR.PRIM.FM.ZS` },
      { name: UNESCO_UIS, url: 'https://uis.unesco.org/bdds' },
    ],
  },
  {
    id: 'genderParityIndexSecondary',
    label: 'Gender parity index (GPI), secondary enrollment',
    description:
      'Compares how many girls versus boys are enrolled in secondary school. Equal enrollment gives a value of 1 (parity). Below 1 means more boys than girls are enrolled; above 1 means more girls than boys. Used to track gender balance in education (SDG 4.5.1).',
    formula:
      'GPI = (Female gross enrollment ratio in secondary education) ÷ (Male gross enrollment ratio in secondary education). Gross enrollment ratio = total enrollment in that level (all ages) ÷ population of official secondary-school age × 100. Data from UNESCO UIS; unit is a ratio (1 = parity). WDI may report the ratio or ratio × 100; this dashboard displays the ratio.',
    unit: 'ratio',
    category: 'education',
    educationSubcategory: 'equity_quality_investment',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.ENR.SECO.FM.ZS` },
      { name: UNESCO_UIS, url: 'https://uis.unesco.org/bdds' },
    ],
  },
  {
    id: 'genderParityIndexTertiary',
    label: 'Gender parity index (GPI), tertiary enrollment',
    description:
      'Compares how many women versus men are enrolled in higher education (university and similar). Equal enrollment gives a value of 1 (parity). Below 1 means more men than women are enrolled; above 1 means more women than men. Used to track gender balance in education (SDG 4.5.1).',
    formula:
      'GPI = (Female gross enrollment ratio in tertiary education) ÷ (Male gross enrollment ratio in tertiary education). Gross enrollment ratio = total enrollment in tertiary (all ages) ÷ population of official tertiary age (typically the five-year age group following upper secondary) × 100. Data from UNESCO UIS; unit is a ratio (1 = parity). WDI may report the ratio or ratio × 100; this dashboard displays the ratio.',
    unit: 'ratio',
    category: 'education',
    educationSubcategory: 'equity_quality_investment',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.ENR.TERT.FM.ZS` },
      { name: UNESCO_UIS, url: 'https://api.uis.unesco.org/api/public/documentation' },
    ],
  },
  // Quality & investment
  {
    id: 'trainedTeachersPrimaryPct',
    label: 'Trained teachers in primary education (% of total teachers)',
    description:
      'Percentage of primary school teachers who have received the minimum organized teacher training (pre-service or in-service) required for teaching at the relevant level. Supports SDG 4.c.1.',
    formula: 'Trained teachers (%) = (Teachers with minimum training / Total primary teachers) × 100',
    unit: '% of total teachers',
    category: 'education',
    educationSubcategory: 'equity_quality_investment',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.PRM.TCAQ.ZS` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'trainedTeachersSecondaryPct',
    label: 'Trained teachers in secondary education (% of total teachers)',
    description:
      'Percentage of secondary school teachers who have received the minimum organized teacher training (pre-service or in-service) required for teaching at the relevant level. UNESCO UIS via World Bank WDI.',
    formula: 'Trained teachers (%) = (Teachers with minimum training / Total secondary teachers) × 100',
    unit: '% of total teachers',
    category: 'education',
    educationSubcategory: 'equity_quality_investment',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.SEC.TCAQ.ZS` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'trainedTeachersTertiaryPct',
    label: 'Trained teachers in tertiary education (% of total teachers)',
    description:
      'Percentage of tertiary education teachers who have received the minimum organized teacher training required for teaching at the relevant level. UNESCO UIS via World Bank WDI; coverage may be sparse.',
    formula: 'Trained teachers (%) = (Teachers with minimum training / Total tertiary teachers) × 100',
    unit: '% of total teachers',
    category: 'education',
    educationSubcategory: 'equity_quality_investment',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.TER.TCAQ.ZS` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
  {
    id: 'publicExpenditureEducationPctGDP',
    label: 'Public expenditure on education (% of GDP)',
    description:
      'Government expenditure on education as a percentage of GDP. Includes spending by local, regional and national governments. Supports SDG 4.5.5 and cross-country comparison of education investment.',
    formula: 'Public expenditure on education (% GDP) = (Government expenditure on education / GDP) × 100',
    unit: '% of GDP',
    category: 'education',
    educationSubcategory: 'equity_quality_investment',
    sources: [
      { name: WORLD_BANK_WDI, url: `${WORLD_BANK_WDI_BASE}/SE.XPD.TOTL.GD.ZS` },
      { name: UNESCO_UIS, url: UNESCO_UIS_URL },
    ],
  },
];
