import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import { sanitizeFilenameSegment } from '../utils/filename';
import type { Frequency, MetricId, MetricSeries, TimePoint, GlobalCountryMetricsRow } from '../types';
import { formatCompactNumber, formatPercentage } from '../utils/numberFormat';
import { formatGrowthChange, isPercentageMetric } from '../utils/growthFormat';
import type { TooltipProps } from 'recharts';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';
import { resampleSeries } from '../utils/timeSeries';
import {
  computeGlobalValue,
  GLOBAL_ECONOMIC_AGGREGATES,
  GLOBAL_HEALTH_AGGREGATES,
  GLOBAL_POP_STRUCTURE_AGGREGATES,
  GLOBAL_UNIFIED_AGGREGATES,
  GLOBAL_EDUCATION_AGGREGATES,
  GLOBAL_LABOUR_AGGREGATES,
} from '../utils/globalAggregates';
import { useToast } from './ToastProvider';
import { GRAPHS_SUBSECTION_CONFIG, type GraphsSubsectionId } from '../data/graphsSubsectionConfig';

/** Forward-fill and back-fill nulls so the series has no gaps (same logic as country-level macro timeline). */
function fillSeriesPoints(points: TimePoint[]): TimePoint[] {
  const result = [...points];
  let last: number | null = null;
  for (let i = 0; i < result.length; i++) {
    const v = result[i].value;
    if (v != null && typeof v === 'number' && !Number.isNaN(v)) last = v;
    else if (last != null) result[i] = { ...result[i], value: last };
  }
  let first: number | null = null;
  for (let i = result.length - 1; i >= 0; i--) {
    const v = result[i].value;
    if (v != null && typeof v === 'number' && !Number.isNaN(v)) first = v;
    else if (first != null) result[i] = { ...result[i], value: first };
  }
  return result;
}

const ECONOMIC_METRIC_IDS: MetricId[] = [
  'inflationCPI',
  'govDebtPercentGDP',
  'interestRate',
  'unemploymentRate',
  'povertyHeadcount215',
  'povertyHeadcountNational',
];

const METRIC_COLORS: Record<string, string> = {
  inflationCPI: '#f97316',
  govDebtPercentGDP: '#7f1d1d',
  interestRate: '#0369a1',
  unemploymentRate: '#22c55e',
  povertyHeadcount215: '#dc2626',
  povertyHeadcountNational: '#b91c1c',
};

const GLOBAL_ECONOMIC_LABELS: Record<string, string> = {
  inflationCPI: 'Inflation (CPI, %)',
  govDebtPercentGDP: 'Government debt (% of GDP)',
  interestRate: 'Lending interest rate (%)',
  unemploymentRate: 'Unemployment rate (% of labour force)',
  povertyHeadcount215: 'Poverty headcount ($2.15/day, %)',
  povertyHeadcountNational: 'Poverty headcount (national line, %)',
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly (interpolated)',
  monthly: 'Monthly (interpolated)',
  quarterly: 'Quarterly (interpolated)',
  yearly: 'Annual (observed)',
};

const UNIFIED_TIMELINE_METRIC_IDS: MetricId[] = [
  'gdpNominal',
  'gdpPPP',
  'gdpNominalPerCapita',
  'gdpPPPPerCapita',
  'govDebtUSD',
  'populationTotal',
];

const UNIFIED_TIMELINE_RIGHT_AXIS: MetricId[] = ['populationTotal'];

const UNIFIED_TIMELINE_COLORS: Record<string, string> = {
  gdpNominal: '#c8102e',
  gdpPPP: '#b45309',
  gdpNominalPerCapita: '#f59e0b',
  gdpPPPPerCapita: '#eab308',
  govDebtUSD: '#991b1b',
  populationTotal: '#111827',
};

const GLOBAL_UNIFIED_LABELS: Record<string, string> = {
  gdpNominal: 'GDP (Nominal, US$)',
  gdpPPP: 'GDP (PPP, Intl$)',
  gdpNominalPerCapita: 'GDP per capita (Nominal, US$)',
  gdpPPPPerCapita: 'GDP per capita (PPP, Intl$)',
  govDebtUSD: 'Government debt (USD)',
  populationTotal: 'Total population',
};

const GLOBAL_UNIFIED_LEGEND_LABELS: Record<string, string> = {
  gdpNominal: 'GDP – nominal',
  gdpPPP: 'GDP – PPP',
  gdpNominalPerCapita: 'GDP per capita – nominal',
  gdpPPPPerCapita: 'GDP per capita – PPP',
  govDebtUSD: 'Government debt',
  populationTotal: 'Population',
};

const HEALTH_METRIC_IDS: MetricId[] = [
  'maternalMortalityRatio',
  'under5MortalityRate',
  'undernourishmentPrevalence',
  'lifeExpectancy',
];

const HEALTH_COLORS: Record<string, string> = {
  maternalMortalityRatio: '#b91c1c',
  under5MortalityRate: '#fb923c',
  undernourishmentPrevalence: '#16a34a',
  lifeExpectancy: '#0f766e',
};

const GLOBAL_HEALTH_LABELS: Record<string, string> = {
  maternalMortalityRatio: 'Maternal mortality ratio (per 100,000 live births)',
  under5MortalityRate: 'Under-5 mortality rate (per 1,000 live births)',
  undernourishmentPrevalence: 'Prevalence of undernourishment (% of population)',
  lifeExpectancy: 'Life expectancy at birth (years)',
};

const GLOBAL_HEALTH_LEGEND_LABELS: Record<string, string> = {
  maternalMortalityRatio: 'Maternal mortality',
  under5MortalityRate: 'Under-5 mortality',
  undernourishmentPrevalence: 'Undernourishment',
  lifeExpectancy: 'Life expectancy',
};

const POP_STRUCTURE_METRIC_IDS: MetricId[] = [
  'pop0_14Share',
  'pop15_64Share',
  'pop65PlusShare',
];

const POP_STRUCTURE_COLORS: Record<string, string> = {
  pop0_14Share: '#c8102e',
  pop15_64Share: '#0369a1',
  pop65PlusShare: '#b45309',
};

const GLOBAL_POP_STRUCTURE_LABELS: Record<string, string> = {
  pop0_14Share: 'Population 0–14 (% of total)',
  pop15_64Share: 'Population 15–64 (% of total)',
  pop65PlusShare: 'Population 65+ (% of total)',
};

const GLOBAL_POP_STRUCTURE_LEGEND_LABELS: Record<string, string> = {
  pop0_14Share: 'Age 0–14',
  pop15_64Share: 'Age 15–64',
  pop65PlusShare: 'Age 65+',
};

const EDUCATION_OOS_METRIC_IDS: MetricId[] = [
  'outOfSchoolPrimaryPct',
  'outOfSchoolSecondaryPct',
  'outOfSchoolTertiaryPct',
  'primaryCompletionRate',
  'secondaryCompletionRate',
  'tertiaryCompletionRate',
];

const EDUCATION_OOS_COLORS: Record<string, string> = {
  outOfSchoolPrimaryPct: '#dc2626',
  outOfSchoolSecondaryPct: '#b91c1c',
  outOfSchoolTertiaryPct: '#991b1b',
  primaryCompletionRate: '#16a34a',
  secondaryCompletionRate: '#15803d',
  tertiaryCompletionRate: '#166534',
};

const GLOBAL_EDUCATION_OOS_LABELS: Record<string, string> = {
  outOfSchoolPrimaryPct: 'Out of school, primary (%)',
  outOfSchoolSecondaryPct: 'Out of school, secondary (%)',
  outOfSchoolTertiaryPct: 'Out of school, tertiary (%)',
  primaryCompletionRate: 'Primary completion rate (%)',
  secondaryCompletionRate: 'Secondary completion rate (%)',
  tertiaryCompletionRate: 'Tertiary completion rate (%)',
};

const GLOBAL_EDUCATION_OOS_LEGEND_LABELS: Record<string, string> = {
  outOfSchoolPrimaryPct: 'Out of school – primary',
  outOfSchoolSecondaryPct: 'Out of school – secondary',
  outOfSchoolTertiaryPct: 'Out of school – tertiary',
  primaryCompletionRate: 'Completion – primary',
  secondaryCompletionRate: 'Completion – secondary',
  tertiaryCompletionRate: 'Completion – tertiary',
};

const EDUCATION_ENROLLMENT_METRIC_IDS: MetricId[] = [
  'primaryPupilsTotal',
  'secondaryPupilsTotal',
  'tertiaryEnrollmentTotal',
  'primaryEnrollmentPct',
  'secondaryEnrollmentPct',
  'tertiaryEnrollmentPct',
  'primarySchoolsTotal',
  'secondarySchoolsTotal',
  'tertiaryInstitutionsTotal',
];

const EDUCATION_INSTITUTION_METRIC_IDS: MetricId[] = [
  'primarySchoolCount',
  'secondarySchoolCount',
  'tertiaryInstitutionCount',
];

const EDUCATION_ENROLLMENT_COLORS: Record<string, string> = {
  primaryPupilsTotal: '#0d9488',
  secondaryPupilsTotal: '#ca8a04',
  tertiaryEnrollmentTotal: '#4f46e5',
  primaryEnrollmentPct: '#0f766e',
  secondaryEnrollmentPct: '#a16207',
  tertiaryEnrollmentPct: '#2563eb',
  primarySchoolsTotal: '#0d9488',
  secondarySchoolsTotal: '#ca8a04',
  tertiaryInstitutionsTotal: '#7c3aed',
};

const EDUCATION_INSTITUTION_COLORS: Record<string, string> = {
  primarySchoolCount: '#059669',
  secondarySchoolCount: '#b45309',
  tertiaryInstitutionCount: '#5b21b6',
};

const GLOBAL_EDUCATION_ENROLLMENT_LEGEND_LABELS: Record<string, string> = {
  primaryPupilsTotal: 'Primary enrollment',
  secondaryPupilsTotal: 'Secondary enrollment',
  tertiaryEnrollmentTotal: 'Tertiary enrollment',
  primaryEnrollmentPct: 'Enrollment rate – primary',
  secondaryEnrollmentPct: 'Enrollment rate – secondary',
  tertiaryEnrollmentPct: 'Enrollment rate – tertiary',
  // Match Country Dashboard: these are teacher counts, not school counts
  primarySchoolsTotal: 'Primary teachers',
  secondarySchoolsTotal: 'Secondary teachers',
  tertiaryInstitutionsTotal: 'Tertiary teachers',
};

const GLOBAL_EDUCATION_INSTITUTION_LEGEND_LABELS: Record<string, string> = {
  primarySchoolCount: 'Primary schools',
  secondarySchoolCount: 'Secondary schools',
  tertiaryInstitutionCount: 'Universities',
};

const GLOBAL_EDUCATION_ENROLLMENT_LABELS: Record<string, string> = {
  primaryPupilsTotal: 'Primary pupils (total)',
  secondaryPupilsTotal: 'Secondary pupils (total)',
  tertiaryEnrollmentTotal: 'Tertiary enrollment (total)',
  primaryEnrollmentPct: 'Primary enrollment (% gross)',
  secondaryEnrollmentPct: 'Secondary enrollment (% gross)',
  tertiaryEnrollmentPct: 'Tertiary enrollment (% gross)',
  // Match Country Dashboard: teacher totals for each level
  primarySchoolsTotal: 'Primary education, teachers (total)',
  secondarySchoolsTotal: 'Secondary education, teachers (total)',
  tertiaryInstitutionsTotal: 'Tertiary education, teachers (total)',
};

const GLOBAL_EDUCATION_INSTITUTION_LABELS: Record<string, string> = {
  primarySchoolCount: 'Number of primary schools',
  secondarySchoolCount: 'Number of secondary schools',
  tertiaryInstitutionCount: 'Number of universities and tertiary institutions',
};

const LABOUR_METRIC_IDS: MetricId[] = ['unemployedTotal', 'labourForceTotal'];

const LABOUR_COLORS: Record<string, string> = {
  unemployedTotal: '#dc2626',
  labourForceTotal: '#0ea5e9',
};

const GLOBAL_LABOUR_LABELS: Record<string, string> = {
  unemployedTotal: 'Unemployed (number)',
  labourForceTotal: 'Labour force (total)',
};

const GLOBAL_LABOUR_LEGEND_LABELS: Record<string, string> = {
  unemployedTotal: 'Unemployed',
  labourForceTotal: 'Labour force',
};

interface Props {
  /** Increment to force refetch (e.g. after "Refresh all data"). */
  refreshTrigger?: number;
  /** Selected min year from the Global Analytics year filter. */
  minYear: number;
  /** Selected max year from the Global Analytics year filter. */
  maxYear: number;
  /** When set, aggregates are computed only for countries in this region (World Bank region name). */
  region?: string | null;
}

export function GlobalChartsSection({
  refreshTrigger = 0,
  minYear,
  maxYear,
  region = null,
}: Props) {
  const [frequency, setFrequency] = useState<Frequency>('yearly');
  const [globalSeries, setGlobalSeries] = useState<MetricSeries[]>([]);
  const [globalHealthSeries, setGlobalHealthSeries] = useState<MetricSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetricIds, setSelectedMetricIds] = useState<MetricId[]>(ECONOMIC_METRIC_IDS);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [isFrequencyOpen, setIsFrequencyOpen] = useState(false);

  const [frequencyUnified, setFrequencyUnified] = useState<Frequency>('yearly');
  const [globalUnifiedSeries, setGlobalUnifiedSeries] = useState<MetricSeries[]>([]);
  const [selectedUnifiedMetricIds, setSelectedUnifiedMetricIds] = useState<MetricId[]>(UNIFIED_TIMELINE_METRIC_IDS);
  const [viewModeUnified, setViewModeUnified] = useState<'chart' | 'table'>('chart');
  const [isFrequencyOpenUnified, setIsFrequencyOpenUnified] = useState(false);

  const [frequencyHealth, setFrequencyHealth] = useState<Frequency>('yearly');
  const [selectedHealthMetricIds, setSelectedHealthMetricIds] = useState<MetricId[]>(HEALTH_METRIC_IDS);
  const [viewModeHealth, setViewModeHealth] = useState<'chart' | 'table'>('chart');
  const [isFrequencyOpenHealth, setIsFrequencyOpenHealth] = useState(false);

  const [frequencyPop, setFrequencyPop] = useState<Frequency>('yearly');
  const [globalPopStructureSeries, setGlobalPopStructureSeries] = useState<MetricSeries[]>([]);
  const [worldPopByYear, setWorldPopByYear] = useState<Record<number, number>>({});
  const [selectedPopMetricIds, setSelectedPopMetricIds] = useState<MetricId[]>(POP_STRUCTURE_METRIC_IDS);

  const [globalEducationEnrollmentSeries, setGlobalEducationEnrollmentSeries] = useState<MetricSeries[]>([]);
  const [frequencyEduEnroll, setFrequencyEduEnroll] = useState<Frequency>('yearly');
  const [selectedEduEnrollMetricIds, setSelectedEduEnrollMetricIds] = useState<MetricId[]>(EDUCATION_ENROLLMENT_METRIC_IDS);
  const [viewModeEduEnroll, setViewModeEduEnroll] = useState<'chart' | 'table'>('chart');
  const [isFrequencyOpenEduEnroll, setIsFrequencyOpenEduEnroll] = useState(false);

  const [globalEducationInstitutionSeries, setGlobalEducationInstitutionSeries] = useState<MetricSeries[]>([]);
  const [frequencyEduInst, setFrequencyEduInst] = useState<Frequency>('yearly');
  const [selectedEduInstMetricIds, setSelectedEduInstMetricIds] = useState<MetricId[]>(EDUCATION_INSTITUTION_METRIC_IDS);
  const [viewModeEduInst, setViewModeEduInst] = useState<'chart' | 'table'>('chart');
  const [isFrequencyOpenEduInst, setIsFrequencyOpenEduInst] = useState(false);

  const [viewModePop, setViewModePop] = useState<'chart' | 'table'>('chart');
  const [isFrequencyOpenPop, setIsFrequencyOpenPop] = useState(false);

  const [globalEducationOOSSeries, setGlobalEducationOOSSeries] = useState<MetricSeries[]>([]);
  const [frequencyEduOOS, setFrequencyEduOOS] = useState<Frequency>('yearly');
  const [selectedEduOOSMetricIds, setSelectedEduOOSMetricIds] = useState<MetricId[]>(EDUCATION_OOS_METRIC_IDS);
  const [viewModeEduOOS, setViewModeEduOOS] = useState<'chart' | 'table'>('chart');
  const [isFrequencyOpenEduOOS, setIsFrequencyOpenEduOOS] = useState(false);

  const [globalLabourSeries, setGlobalLabourSeries] = useState<MetricSeries[]>([]);
  const [frequencyLabour, setFrequencyLabour] = useState<Frequency>('yearly');
  const [selectedLabourMetricIds, setSelectedLabourMetricIds] = useState<MetricId[]>(LABOUR_METRIC_IDS);
  const [viewModeLabour, setViewModeLabour] = useState<'chart' | 'table'>('chart');
  const [isFrequencyOpenLabour, setIsFrequencyOpenLabour] = useState(false);

  const [sectionExpanded, setSectionExpanded] = useState(true);
  const [subsectionsExpanded, setSubsectionsExpanded] = useState<Record<GraphsSubsectionId, boolean>>(
    () =>
      GRAPHS_SUBSECTION_CONFIG.reduce(
        (acc, { id }) => ({ ...acc, [id]: true }),
        {} as Record<GraphsSubsectionId, boolean>,
      ),
  );
  const toggleSubsection = (id: GraphsSubsectionId) => {
    setSubsectionsExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const expandAllSubsections = () => {
    setSubsectionsExpanded(
      GRAPHS_SUBSECTION_CONFIG.reduce(
        (acc, { id }) => ({ ...acc, [id]: true }),
        {} as Record<GraphsSubsectionId, boolean>,
      ),
    );
  };
  const collapseAllSubsections = () => {
    setSubsectionsExpanded(
      GRAPHS_SUBSECTION_CONFIG.reduce(
        (acc, { id }) => ({ ...acc, [id]: false }),
        {} as Record<GraphsSubsectionId, boolean>,
      ),
    );
  };
  const allExpanded = GRAPHS_SUBSECTION_CONFIG.every(({ id }) => subsectionsExpanded[id]);
  const { showToast, updateToast, dismissToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const start = performance.now();
    const loadingToastId = showToast({
      type: 'loading',
      message: 'Loading global macro indicators… (0%)',
    });
    const years = Array.from(
      { length: DATA_MAX_YEAR - DATA_MIN_YEAR + 1 },
      (_, i) => DATA_MIN_YEAR + i,
    );
    Promise.all(years.map((y) => fetchGlobalCountryMetricsForYear(y)))
      .then((rowsPerYear) => {
        if (cancelled) return;

        const filterByRegion = (rows: GlobalCountryMetricsRow[]) =>
          region ? rows.filter((r) => r.region === region) : rows;

        const seriesList: MetricSeries[] = ECONOMIC_METRIC_IDS.map((id) => {
          const config = GLOBAL_ECONOMIC_AGGREGATES[id];
          const points: TimePoint[] = rowsPerYear.map((rows, i) => {
            const year = years[i];
            const value = config
              ? computeGlobalValue(filterByRegion(rows), config.valueKey, config.option)
              : null;
            return { date: `${year}-01-01`, year, value };
          });
          return {
            id,
            label: GLOBAL_ECONOMIC_LABELS[id] ?? id,
            unit: '%',
            points: fillSeriesPoints(points),
          };
        });

        const healthSeriesList: MetricSeries[] = HEALTH_METRIC_IDS.map((id) => {
          const config = GLOBAL_HEALTH_AGGREGATES[id];
          const points: TimePoint[] = rowsPerYear.map((rows, i) => {
            const year = years[i];
            const value = config
              ? computeGlobalValue(filterByRegion(rows), config.valueKey, config.option)
              : null;
            return {
              date: `${year}-01-01`,
              year,
              value,
            };
          });
          return {
            id,
            label: GLOBAL_HEALTH_LABELS[id] ?? id,
            unit: id === 'lifeExpectancy' ? 'years' : '%',
            points: fillSeriesPoints(points),
          };
        });
        setGlobalSeries(seriesList);
        setGlobalHealthSeries(healthSeriesList);
        const unifiedSeriesList: MetricSeries[] = UNIFIED_TIMELINE_METRIC_IDS.map((id) => {
          const config = GLOBAL_UNIFIED_AGGREGATES[id];
          const points: TimePoint[] = rowsPerYear.map((rows, i) => {
            const year = years[i];
            const value = config
              ? computeGlobalValue(filterByRegion(rows), config.valueKey, config.option)
              : null;
            return { date: `${year}-01-01`, year, value };
          });
          return {
            id,
            label: GLOBAL_UNIFIED_LABELS[id] ?? id,
            unit: '',
            points: fillSeriesPoints(points),
          };
        });
        setGlobalUnifiedSeries(unifiedSeriesList);
        const popStructureSeriesList: MetricSeries[] = POP_STRUCTURE_METRIC_IDS.map((id) => {
          const config = GLOBAL_POP_STRUCTURE_AGGREGATES[id];
          const points: TimePoint[] = rowsPerYear.map((rows, i) => {
            const year = years[i];
            const value = config
              ? computeGlobalValue(filterByRegion(rows), config.valueKey, config.option)
              : null;
            return {
              date: `${year}-01-01`,
              year,
              value,
            };
          });
          return {
            id,
            label: GLOBAL_POP_STRUCTURE_LABELS[id] ?? id,
            unit: '%',
            points: fillSeriesPoints(points),
          };
        });
        setGlobalPopStructureSeries(popStructureSeriesList);
        const popByYear: Record<number, number> = {};
        rowsPerYear.forEach((rows, i) => {
          const year = years[i];
          const filtered = filterByRegion(rows);
          const total = filtered.reduce(
            (s, r) => s + (r.populationTotal != null && !Number.isNaN(r.populationTotal) ? r.populationTotal : 0),
            0,
          );
          if (total > 0) popByYear[year] = total;
        });
        setWorldPopByYear(popByYear);

        const educationOOSSeriesList: MetricSeries[] = EDUCATION_OOS_METRIC_IDS.map((id) => {
          const config = GLOBAL_EDUCATION_AGGREGATES[id];
          const points: TimePoint[] = rowsPerYear.map((rows, i) => {
            const year = years[i];
            const value = config
              ? computeGlobalValue(filterByRegion(rows), config.valueKey, config.option)
              : null;
            return { date: `${year}-01-01`, year, value };
          });
          return {
            id,
            label: GLOBAL_EDUCATION_OOS_LABELS[id] ?? id,
            unit: '%',
            points: fillSeriesPoints(points),
          };
        });
        setGlobalEducationOOSSeries(educationOOSSeriesList);

        const educationEnrollmentSeriesList: MetricSeries[] = EDUCATION_ENROLLMENT_METRIC_IDS.map((id) => {
          const config = GLOBAL_EDUCATION_AGGREGATES[id];
          const points: TimePoint[] = rowsPerYear.map((rows, i) => {
            const year = years[i];
            const value = config
              ? computeGlobalValue(filterByRegion(rows), config.valueKey, config.option)
              : null;
            return { date: `${year}-01-01`, year, value };
          });
          const isPct = id.endsWith('Pct');
          return {
            id,
            label: GLOBAL_EDUCATION_ENROLLMENT_LABELS[id] ?? id,
            unit: isPct ? '%' : '',
            points: fillSeriesPoints(points),
          };
        });
        setGlobalEducationEnrollmentSeries(educationEnrollmentSeriesList);

        const educationInstitutionSeriesList: MetricSeries[] = EDUCATION_INSTITUTION_METRIC_IDS.map((id) => {
          const config = GLOBAL_EDUCATION_AGGREGATES[id];
          const points: TimePoint[] = rowsPerYear.map((rows, i) => {
            const year = years[i];
            const value = config
              ? computeGlobalValue(filterByRegion(rows), config.valueKey, config.option)
              : null;
            return { date: `${year}-01-01`, year, value };
          });
          return {
            id,
            label: GLOBAL_EDUCATION_INSTITUTION_LABELS[id] ?? id,
            unit: '',
            points: fillSeriesPoints(points),
          };
        });
        setGlobalEducationInstitutionSeries(educationInstitutionSeriesList);

        const labourSeriesList: MetricSeries[] = LABOUR_METRIC_IDS.map((id) => {
          const config = GLOBAL_LABOUR_AGGREGATES[id];
          const points: TimePoint[] = rowsPerYear.map((rows, i) => {
            const year = years[i];
            const value = config
              ? computeGlobalValue(filterByRegion(rows), config.valueKey, config.option)
              : null;
            return { date: `${year}-01-01`, year, value };
          });
          return {
            id,
            label: GLOBAL_LABOUR_LABELS[id] ?? id,
            unit: '',
            points: fillSeriesPoints(points),
          };
        });
        setGlobalLabourSeries(labourSeriesList);
        if (!cancelled) {
          setLoading(false);
          const seconds = Math.max((performance.now() - start) / 1000, 0.1).toFixed(1);
          updateToast(loadingToastId, {
            type: 'success',
            message: `Global macro indicators loaded (100%, ${seconds}s).`,
            durationMs: 6000,
          });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load global metrics.');
          setLoading(false);
          const seconds = Math.max((performance.now() - start) / 1000, 0.1).toFixed(1);
          updateToast(loadingToastId, {
            type: 'error',
            message: `Failed to load global macro indicators (0%, ${seconds}s).`,
            durationMs: 6000,
          });
        }
      });
    return () => {
      cancelled = true;
      dismissToast(loadingToastId);
    };
  }, [refreshTrigger, region, showToast, updateToast, dismissToast]);

  const allSeries = globalSeries;
  const resampledSeries = allSeries.map((s) => resampleSeries(s, frequency));

  const displayStartYear = Math.max(
    DATA_MIN_YEAR,
    Math.min(minYear, maxYear),
  );
  const displayEndYear = Math.min(
    DATA_MAX_YEAR,
    Math.max(maxYear, minYear),
  );

  const labelByMetricId = allSeries.reduce<Record<string, string>>(
    (acc, series) => {
      acc[series.id] = series.label;
      return acc;
    },
    {},
  );

  const dateSet = new Map<string, number>();
  for (const s of resampledSeries) {
    const points = s.points ?? [];
    for (const p of points) {
      if (p.year < displayStartYear || p.year > displayEndYear) continue;
      dateSet.set(p.date, p.year);
    }
  }
  const sortedDates = [...dateSet.entries()].sort(
    (a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0].localeCompare(b[0])),
  );
  const baseData = sortedDates.map(([date, year]) => ({ date, year }));

  const seriesById = new Map<string, MetricSeries>();
  for (const s of resampledSeries) {
    seriesById.set(s.id, s);
  }

  const getMetricValueAtDate = (metricId: MetricId, date: string): number | null => {
    const seriesForMetric = seriesById.get(metricId);
    if (!seriesForMetric) return null;
    return seriesForMetric.points?.find((sp) => sp.date === date)?.value ?? null;
  };

  const merged = baseData.map((p) => {
    const row: Record<string, string | number | null> = {
      date: p.date,
      year: p.year,
    };
    for (const metricId of ECONOMIC_METRIC_IDS) {
      row[metricId] = getMetricValueAtDate(metricId, p.date);
    }
    return row;
  });

  const allUnifiedSeries = globalUnifiedSeries;
  const resampledUnifiedSeries = allUnifiedSeries.map((s) => resampleSeries(s, frequencyUnified));
  const labelByMetricIdUnified = allUnifiedSeries.reduce<Record<string, string>>(
    (acc, series) => {
      acc[series.id] = series.label;
      return acc;
    },
    {},
  );
  const dateSetUnified = new Map<string, number>();
  for (const s of resampledUnifiedSeries) {
    const points = s.points ?? [];
    for (const p of points) {
      if (p.year < displayStartYear || p.year > displayEndYear) continue;
      dateSetUnified.set(p.date, p.year);
    }
  }
  const sortedDatesUnified = [...dateSetUnified.entries()].sort(
    (a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0].localeCompare(b[0])),
  );
  const baseDataUnified = sortedDatesUnified.map(([date, year]) => ({ date, year }));
  const seriesByIdUnified = new Map<string, MetricSeries>();
  for (const s of resampledUnifiedSeries) {
    seriesByIdUnified.set(s.id, s);
  }
  const getUnifiedMetricValueAtDate = (metricId: MetricId, date: string): number | null =>
    seriesByIdUnified.get(metricId)?.points?.find((sp) => sp.date === date)?.value ?? null;
  const mergedUnified = baseDataUnified.map((p) => {
    const row: Record<string, string | number | null> = {
      date: p.date,
      year: p.year,
    };
    for (const metricId of UNIFIED_TIMELINE_METRIC_IDS) {
      row[metricId] = getUnifiedMetricValueAtDate(metricId, p.date);
    }
    return row;
  });
  const xKeyUnified = frequencyUnified === 'yearly' ? 'year' : 'date';
  const rawTicksUnified =
    frequencyUnified === 'yearly'
      ? baseDataUnified.map((p) => p.year)
      : baseDataUnified.map((p) => p.date);
  const stepUnified =
    rawTicksUnified.length <= 6 ? 1 : Math.max(1, Math.floor(rawTicksUnified.length / 6));
  const xTicksUnified = rawTicksUnified.filter((_, index) => index % stepUnified === 0);
  const formatAxisLabelUnified = (value: string | number) => {
    if (frequencyUnified === 'yearly') return String(value);
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    if (frequencyUnified === 'monthly') {
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    if (frequencyUnified === 'quarterly') {
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      return `Q${quarter} ${d.getFullYear()}`;
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  };
  const freqLabelUnified: Record<Frequency, string> = {
    weekly: 'WoW',
    monthly: 'MoM',
    quarterly: 'QoQ',
    yearly: 'YoY',
  };

  const scopeLabel = sanitizeFilenameSegment(region ?? 'Global');

  const downloadUnifiedChartPng = async () => {
    const el = document.getElementById('global-unified-chart-wrapper');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `${scopeLabel}-unified-gdp-debt-population-${maxYear}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Global unified chart export failed:', err);
    }
  };

  const downloadUnifiedCsv = () => {
    const rows: string[] = [];
    const header = [
      frequencyUnified === 'yearly' ? 'Year' : 'Period',
      ...UNIFIED_TIMELINE_METRIC_IDS.map((id) => labelByMetricIdUnified[id] ?? id),
    ];
    rows.push(header.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));
    mergedUnified.forEach((row) => {
      const cells: string[] = [];
      cells.push(
        `"${String(formatAxisLabelUnified(row[xKeyUnified] as string | number)).replace(
          /"/g,
          '""',
        )}"`,
      );
      UNIFIED_TIMELINE_METRIC_IDS.forEach((id) => {
        const v = row[id];
        cells.push(v == null ? '' : String(v));
      });
      rows.push(cells.join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scopeLabel}-unified-gdp-debt-population-${maxYear}-data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadEconomicChartPng = async () => {
    const el = document.getElementById('global-economic-chart-wrapper');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `${scopeLabel}-macro-economic-${maxYear}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Global economic chart export failed:', err);
    }
  };

  const downloadEconomicCsv = () => {
    const rows: string[] = [];
    const header = [
      frequency === 'yearly' ? 'Year' : 'Period',
      ...ECONOMIC_METRIC_IDS.map((id) => labelByMetricId[id] ?? id),
    ];
    rows.push(header.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));
    merged.forEach((row) => {
      const cells: string[] = [];
      cells.push(
        `"${String(formatAxisLabel(row[xKey] as string | number)).replace(/"/g, '""')}"`,
      );
      ECONOMIC_METRIC_IDS.forEach((id) => {
        const v = row[id];
        cells.push(v == null ? '' : String(v));
      });
      rows.push(cells.join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scopeLabel}-macro-economic-${maxYear}-data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadHealthChartPng = async () => {
    const el = document.getElementById('global-health-chart-wrapper');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `${scopeLabel}-health-mortality-nutrition-life-expectancy-${maxYear}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Global health chart export failed:', err);
    }
  };

  const downloadHealthCsv = () => {
    const rows: string[] = [];
    const header = [
      frequencyHealth === 'yearly' ? 'Year' : 'Period',
      ...HEALTH_METRIC_IDS.map((id) => GLOBAL_HEALTH_LABELS[id] ?? id),
    ];
    rows.push(header.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));
    mergedHealth.forEach((row) => {
      const cells: string[] = [];
      cells.push(
        `"${String(formatAxisLabelHealth(row[xKeyHealth] as string | number)).replace(
          /"/g,
          '""',
        )}"`,
      );
      HEALTH_METRIC_IDS.forEach((id) => {
        const v = row[id];
        cells.push(v == null ? '' : String(v));
      });
      rows.push(cells.join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scopeLabel}-health-mortality-nutrition-life-expectancy-${maxYear}-data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPopChartPng = async () => {
    const el = document.getElementById('global-population-structure-chart-wrapper');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `${scopeLabel}-population-age-structure-${maxYear}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Global population structure chart export failed:', err);
    }
  };

  const downloadPopCsv = () => {
    const rows: string[] = [];
    const header = [
      frequencyPop === 'yearly' ? 'Year' : 'Period',
      ...POP_STRUCTURE_METRIC_IDS.map((id) => GLOBAL_POP_STRUCTURE_LABELS[id] ?? id),
    ];
    rows.push(header.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));
    mergedPop.forEach((row) => {
      const cells: string[] = [];
      cells.push(
        `"${String(formatAxisLabelPop(row[xKeyPop] as string | number)).replace(/"/g, '""')}"`,
      );
      POP_STRUCTURE_METRIC_IDS.forEach((id) => {
        const v = row[id];
        cells.push(v == null ? '' : String(v));
      });
      rows.push(cells.join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scopeLabel}-population-age-structure-${maxYear}-data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadEduEnrollChartPng = async () => {
    const el = document.getElementById('global-education-enrollment-chart-wrapper');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `${scopeLabel}-education-enrollment-teaching-workforce-${maxYear}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Global education enrollment chart export failed:', err);
    }
  };

  const downloadEduEnrollCsv = () => {
    const rows: string[] = [];
    const header = [
      frequencyEduEnroll === 'yearly' ? 'Year' : 'Period',
      ...EDUCATION_ENROLLMENT_METRIC_IDS.map((id) => eduEnrollData.labelByMetricId[id] ?? id),
    ];
    rows.push(header.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));
    eduEnrollData.merged.forEach((row) => {
      const cells: string[] = [];
      cells.push(
        `"${String(
          eduEnrollData.formatAxisLabel(row[eduEnrollData.xKey] as string | number),
        ).replace(/"/g, '""')}"`,
      );
      EDUCATION_ENROLLMENT_METRIC_IDS.forEach((id) => {
        const v = row[id];
        cells.push(v == null ? '' : String(v));
      });
      rows.push(cells.join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scopeLabel}-education-enrollment-teaching-workforce-${maxYear}-data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadEduInstChartPng = async () => {
    const el = document.getElementById('global-education-institutions-chart-wrapper');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `${scopeLabel}-schools-universities-institution-counts-${maxYear}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Global education institutions chart export failed:', err);
    }
  };

  const downloadEduInstCsv = () => {
    const rows: string[] = [];
    const header = [
      frequencyEduInst === 'yearly' ? 'Year' : 'Period',
      ...EDUCATION_INSTITUTION_METRIC_IDS.map(
        (id) => eduInstData.labelByMetricId[id] ?? id,
      ),
    ];
    rows.push(header.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));
    eduInstData.merged.forEach((row) => {
      const cells: string[] = [];
      cells.push(
        `"${String(
          eduInstData.formatAxisLabel(row[eduInstData.xKey] as string | number),
        ).replace(/"/g, '""')}"`,
      );
      EDUCATION_INSTITUTION_METRIC_IDS.forEach((id) => {
        const v = row[id];
        cells.push(v == null ? '' : String(v));
      });
      rows.push(cells.join(','));
    });
    const blob = new Blob([rows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scopeLabel}-schools-universities-institution-counts-${maxYear}-data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadEduOOSChartPng = async () => {
    const el = document.getElementById('global-education-oos-chart-wrapper');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `${scopeLabel}-education-access-completion-${maxYear}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Global education OOS/completion chart export failed:', err);
    }
  };

  const downloadEduOOSCsv = () => {
    const rows: string[] = [];
    const header = [
      frequencyEduOOS === 'yearly' ? 'Year' : 'Period',
      ...EDUCATION_OOS_METRIC_IDS.map((id) => eduOOSData.labelByMetricId[id] ?? id),
    ];
    rows.push(header.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));
    eduOOSData.merged.forEach((row) => {
      const cells: string[] = [];
      cells.push(
        `"${String(
          eduOOSData.formatAxisLabel(row[eduOOSData.xKey] as string | number),
        ).replace(/"/g, '""')}"`,
      );
      EDUCATION_OOS_METRIC_IDS.forEach((id) => {
        const v = row[id];
        cells.push(v == null ? '' : String(v));
      });
      rows.push(cells.join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scopeLabel}-education-access-completion-${maxYear}-data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadLabourChartPng = async () => {
    const el = document.getElementById('global-labour-chart-wrapper');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `${scopeLabel}-labour-force-unemployment-${maxYear}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Global labour chart export failed:', err);
    }
  };

  const downloadLabourCsv = () => {
    const rows: string[] = [];
    const header = [
      frequencyLabour === 'yearly' ? 'Year' : 'Period',
      ...LABOUR_METRIC_IDS.map((id) => labourData.labelByMetricId[id] ?? id),
    ];
    rows.push(header.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','));
    labourData.merged.forEach((row) => {
      const cells: string[] = [];
      cells.push(
        `"${String(
          labourData.formatAxisLabel(row[labourData.xKey] as string | number),
        ).replace(/"/g, '""')}"`,
      );
      LABOUR_METRIC_IDS.forEach((id) => {
        const v = row[id];
        cells.push(v == null ? '' : String(v));
      });
      rows.push(cells.join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scopeLabel}-labour-force-unemployment-${maxYear}-data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const allHealthSeries = globalHealthSeries;
  const resampledHealthSeries = allHealthSeries.map((s) => resampleSeries(s, frequencyHealth));
  const labelByMetricIdHealth = allHealthSeries.reduce<Record<string, string>>(
    (acc, series) => {
      acc[series.id] = series.label;
      return acc;
    },
    {},
  );
  const dateSetHealth = new Map<string, number>();
  for (const s of resampledHealthSeries) {
    const points = s.points ?? [];
    for (const p of points) {
      if (p.year < displayStartYear || p.year > displayEndYear) continue;
      dateSetHealth.set(p.date, p.year);
    }
  }
  const sortedDatesHealth = [...dateSetHealth.entries()].sort(
    (a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0].localeCompare(b[0])),
  );
  const baseDataHealth = sortedDatesHealth.map(([date, year]) => ({ date, year }));
  const seriesByIdHealth = new Map<string, MetricSeries>();
  for (const s of resampledHealthSeries) {
    seriesByIdHealth.set(s.id, s);
  }
  const getHealthMetricValueAtDate = (metricId: MetricId, date: string): number | null => {
    const seriesForMetric = seriesByIdHealth.get(metricId);
    if (!seriesForMetric) return null;
    const v = seriesForMetric.points?.find((sp) => sp.date === date)?.value ?? null;
    return v != null && typeof v === 'number' ? v : null;
  };
  const mergedHealth = baseDataHealth.map((p) => {
    const row: Record<string, string | number | null> = {
      date: p.date,
      year: p.year,
    };
    for (const metricId of HEALTH_METRIC_IDS) {
      row[metricId] = getHealthMetricValueAtDate(metricId, p.date);
    }
    return row;
  });
  const xKeyHealth = frequencyHealth === 'yearly' ? 'year' : 'date';
  const rawTicksHealth =
    frequencyHealth === 'yearly'
      ? baseDataHealth.map((p) => p.year)
      : baseDataHealth.map((p) => p.date);
  const stepHealth =
    rawTicksHealth.length <= 6 ? 1 : Math.max(1, Math.floor(rawTicksHealth.length / 6));
  const xTicksHealth = rawTicksHealth.filter((_, index) => index % stepHealth === 0);
  const formatAxisLabelHealth = (value: string | number) => {
    if (frequencyHealth === 'yearly') return String(value);
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    if (frequencyHealth === 'monthly') {
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    if (frequencyHealth === 'quarterly') {
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      return `Q${quarter} ${d.getFullYear()}`;
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  };
  const freqLabelHealth: Record<Frequency, string> = {
    weekly: 'WoW',
    monthly: 'MoM',
    quarterly: 'QoQ',
    yearly: 'YoY',
  };

  const allPopSeries = globalPopStructureSeries;
  const resampledPopSeries = allPopSeries.map((s) => resampleSeries(s, frequencyPop));
  const labelByMetricIdPop = allPopSeries.reduce<Record<string, string>>(
    (acc, series) => {
      acc[series.id] = series.label;
      return acc;
    },
    {},
  );
  const dateSetPop = new Map<string, number>();
  for (const s of resampledPopSeries) {
    const points = s.points ?? [];
    for (const p of points) {
      if (p.year < displayStartYear || p.year > displayEndYear) continue;
      dateSetPop.set(p.date, p.year);
    }
  }
  const sortedDatesPop = [...dateSetPop.entries()].sort(
    (a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0].localeCompare(b[0])),
  );
  const baseDataPop = sortedDatesPop.map(([date, year]) => ({ date, year }));
  const seriesByIdPop = new Map<string, MetricSeries>();
  for (const s of resampledPopSeries) {
    seriesByIdPop.set(s.id, s);
  }
  const getPopMetricValueAtDate = (metricId: MetricId, date: string): number | null =>
    seriesByIdPop.get(metricId)?.points?.find((sp) => sp.date === date)?.value ?? null;
  const shareToAbsoluteIdPop: Record<string, string> = {
    pop0_14Share: 'pop0_14Abs',
    pop15_64Share: 'pop15_64Abs',
    pop65PlusShare: 'pop65PlusAbs',
  };
  const mergedPop = baseDataPop.map((p) => {
    const row: Record<string, string | number | null> = {
      date: p.date,
      year: p.year,
    };
    const yearForPop = typeof p.year === 'number' ? p.year : parseInt(String(p.date).slice(0, 4), 10);
    const totalPop = worldPopByYear[p.year] ?? worldPopByYear[yearForPop] ?? null;
    for (const metricId of POP_STRUCTURE_METRIC_IDS) {
      const share = getPopMetricValueAtDate(metricId, p.date);
      row[metricId] = share;
      const absId = shareToAbsoluteIdPop[metricId];
      if (absId && totalPop != null && share != null && Number.isFinite(totalPop) && Number.isFinite(share)) {
        row[absId] = (totalPop * share) / 100;
      } else {
        row[absId] = null;
      }
    }
    return row;
  });
  const xKeyPop = frequencyPop === 'yearly' ? 'year' : 'date';
  const rawTicksPop =
    frequencyPop === 'yearly'
      ? baseDataPop.map((p) => p.year)
      : baseDataPop.map((p) => p.date);
  const stepPop =
    rawTicksPop.length <= 6 ? 1 : Math.max(1, Math.floor(rawTicksPop.length / 6));
  const xTicksPop = rawTicksPop.filter((_, index) => index % stepPop === 0);
  const formatAxisLabelPop = (value: string | number) => {
    if (frequencyPop === 'yearly') return String(value);
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    if (frequencyPop === 'monthly') {
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    if (frequencyPop === 'quarterly') {
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      return `Q${quarter} ${d.getFullYear()}`;
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  };
  const freqLabelPop: Record<Frequency, string> = {
    weekly: 'WoW',
    monthly: 'MoM',
    quarterly: 'QoQ',
    yearly: 'YoY',
  };

  /** Build merged data + axis helpers for a block given series, frequency, and metric ids. */
  function buildBlockData(
    allSeries: MetricSeries[],
    freq: Frequency,
    metricIds: MetricId[],
  ) {
    const resampled = allSeries.map((s) => resampleSeries(s, freq));
    const labelByMetricId = allSeries.reduce<Record<string, string>>(
      (acc, s) => {
        acc[s.id] = s.label;
        return acc;
      },
      {},
    );
    const dateSet = new Map<string, number>();
    for (const s of resampled) {
      for (const p of s.points ?? []) {
        if (p.year < displayStartYear || p.year > displayEndYear) continue;
        dateSet.set(p.date, p.year);
      }
    }
    const sortedDates = [...dateSet.entries()].sort(
      (a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0].localeCompare(b[0])),
    );
    const baseData = sortedDates.map(([date, year]) => ({ date, year }));
    const seriesById = new Map<string, MetricSeries>();
    for (const s of resampled) seriesById.set(s.id, s);
    const getVal = (metricId: MetricId, date: string): number | null =>
      seriesById.get(metricId)?.points?.find((sp) => sp.date === date)?.value ?? null;
    const merged = baseData.map((p) => {
      const row: Record<string, string | number | null> = { date: p.date, year: p.year };
      for (const id of metricIds) row[id] = getVal(id, p.date);
      return row;
    });
    const xKey = freq === 'yearly' ? 'year' : 'date';
    const rawTicks = freq === 'yearly' ? baseData.map((p) => p.year) : baseData.map((p) => p.date);
    const step = rawTicks.length <= 6 ? 1 : Math.max(1, Math.floor(rawTicks.length / 6));
    const xTicks = rawTicks.filter((_, i) => i % step === 0);
    const formatAxisLabel = (value: string | number) => {
      if (freq === 'yearly') return String(value);
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) return String(value);
      if (freq === 'monthly') return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (freq === 'quarterly') return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    };
    const freqLabel: Record<Frequency, string> = { weekly: 'WoW', monthly: 'MoM', quarterly: 'QoQ', yearly: 'YoY' };
    return { merged, labelByMetricId, baseData, xKey, xTicks, formatAxisLabel, freqLabel };
  }

  const eduOOSData = buildBlockData(globalEducationOOSSeries, frequencyEduOOS, EDUCATION_OOS_METRIC_IDS);
  const eduEnrollData = buildBlockData(globalEducationEnrollmentSeries, frequencyEduEnroll, EDUCATION_ENROLLMENT_METRIC_IDS);
  const labourData = buildBlockData(globalLabourSeries, frequencyLabour, LABOUR_METRIC_IDS);
  const eduInstData = buildBlockData(
    globalEducationInstitutionSeries,
    frequencyEduInst,
    EDUCATION_INSTITUTION_METRIC_IDS,
  );

  const xKey = frequency === 'yearly' ? 'year' : 'date';

  const formatAxisLabel = (value: string | number) => {
    if (frequency === 'yearly') return String(value);
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    if (frequency === 'monthly') {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    }
    if (frequency === 'quarterly') {
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      return `Q${quarter} ${d.getFullYear()}`;
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  };

  const rawTicks =
    frequency === 'yearly'
      ? baseData.map((p) => p.year)
      : baseData.map((p) => p.date);
  const step =
    rawTicks.length <= 6 ? 1 : Math.max(1, Math.floor(rawTicks.length / 6));
  const xTicks = rawTicks.filter((_, index) => index % step === 0);

  const freqLabel: Record<Frequency, string> = {
    weekly: 'WoW',
    monthly: 'MoM',
    quarterly: 'QoQ',
    yearly: 'YoY',
  };

  const CustomTooltip = ({
    active,
    label,
    payload,
    mergedOverride,
    xKeyOverride,
    labelByMetricIdOverride,
    selectedMetricIdsOverride,
    frequencyOverride,
    formatAxisLabelOverride,
    metricIdsOverride,
    formatValueOverride,
    freqLabelOverride,
    absoluteKeyByMetricId,
  }: TooltipProps<number, string> & {
    active?: boolean;
    label?: string;
    payload?: Array<{ dataKey?: string; value?: number; color?: string; name?: string }>;
    mergedOverride?: typeof merged;
    xKeyOverride?: string;
    labelByMetricIdOverride?: Record<string, string>;
    selectedMetricIdsOverride?: string[];
    frequencyOverride?: Frequency;
    formatAxisLabelOverride?: (v: string | number) => string;
    metricIdsOverride?: string[];
    formatValueOverride?: (id: string, v: number | null) => string;
    freqLabelOverride?: Record<Frequency, string>;
    /** When set, each metric row shows value + " · " + absolute (e.g. "25.3% · 2.1 Bn"). */
    absoluteKeyByMetricId?: Record<string, string>;
  }) => {
    if (!active || !payload || !payload.length) return null;

    const data = mergedOverride ?? merged;
    const xK = xKeyOverride ?? xKey;
    const labels = labelByMetricIdOverride ?? labelByMetricId;
    const selectedIds = selectedMetricIdsOverride ?? selectedMetricIds;
    const freq = frequencyOverride ?? frequency;
    const formatAxis = formatAxisLabelOverride ?? formatAxisLabel;
    const metricIds = metricIdsOverride ?? ECONOMIC_METRIC_IDS;
    const freqLbl = freqLabelOverride ?? freqLabel;
    const formatVal = formatValueOverride ?? ((_id: string, v: number | null) => (v != null ? formatCompactNumber(v) : '–'));

    const byMetricId = new Map<
      string,
      {
        id: string;
        name: string;
        value: number;
        color: string;
        change?: string;
        changeDirection?: 'up' | 'down' | 'flat';
      }
    >();
    const index = data.findIndex((row) => row[xK] === label);
    const prevRow = index > 0 ? data[index - 1] : undefined;

    payload.forEach((p) => {
      if (p.value == null || p.dataKey == null) return;
      const id = String(p.dataKey);
      const current = p.value as number;
      const prev =
        prevRow && prevRow[id] != null ? (prevRow[id] as number) : null;

      let change: string | undefined;
      let changeDirection: 'up' | 'down' | 'flat' | undefined;
      const formatted = formatGrowthChange(current, prev ?? null, freqLbl[freq], id);
      if (formatted) {
        change = formatted;
        const diff = current - (prev ?? 0);
        if (isPercentageMetric(id)) {
          if (diff > 0.05) changeDirection = 'up';
          else if (diff < -0.05) changeDirection = 'down';
          else changeDirection = 'flat';
        } else if (prev != null && prev !== 0) {
          const pct = (diff / Math.abs(prev)) * 100;
          if (pct > 0.05) changeDirection = 'up';
          else if (pct < -0.05) changeDirection = 'down';
          else changeDirection = 'flat';
        }
      }

      byMetricId.set(id, {
        id,
        name: labels[id] ?? String(p.name),
        value: current,
        color: p.color ?? '#6b7280',
        change,
        changeDirection,
      });
    });

    const rowsByCategory = [
      {
        label: '',
        rows: metricIds.filter((id) => selectedIds.includes(id))
          .map((id) => byMetricId.get(id))
          .filter((r): r is NonNullable<typeof r> => r != null),
      },
    ].filter((g) => g.rows.length > 0);

    if (!rowsByCategory[0]?.rows.length) return null;

    const dataRow = index >= 0 && index < data.length ? data[index] : undefined;

    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-title">
          {freq === 'yearly'
            ? `Year ${label}`
            : String(formatAxis(label as string | number))}
        </div>
        <div className="chart-tooltip-body">
          {rowsByCategory.map((group) => (
            <div key={group.label || 'metrics'} className="chart-tooltip-category">
              {group.label ? (
                <div className="chart-tooltip-category-label">{group.label}</div>
              ) : null}
              {group.rows.map((row) => {
                const absKey = absoluteKeyByMetricId?.[row.id];
                const absVal =
                  dataRow && absKey && dataRow[absKey] != null && Number.isFinite(Number(dataRow[absKey]))
                    ? Number(dataRow[absKey])
                    : null;
                return (
                  <div key={row.name} className="chart-tooltip-row">
                    <span
                      className="chart-tooltip-dot"
                      style={{ backgroundColor: row.color }}
                    />
                    <div className="chart-tooltip-label">{row.name}</div>
                    <div className="chart-tooltip-value">
                      {formatVal(row.id, row.value)}
                      {absVal != null && (
                        <span className="chart-tooltip-absolute">
                          {' · '}{formatCompactNumber(absVal)}
                        </span>
                      )}
                    </div>
                    {row.change && (
                    <div
                      className={`chart-tooltip-change ${
                        row.changeDirection === 'up'
                          ? 'chart-tooltip-change-up'
                          : row.changeDirection === 'down'
                            ? 'chart-tooltip-change-down'
                            : 'chart-tooltip-change-flat'
                      }`}
                    >
                      {row.change}
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <section className="card graphs-section">
        <button
          type="button"
          className="graphs-section-header"
          aria-expanded={false}
          aria-controls="global-charts-section-content"
        >
          <span className="graphs-section-chevron" aria-hidden>▸</span>
          <span className="graphs-section-title">Global Charts</span>
        </button>
        <div id="global-charts-section-content" className="graphs-section-content">
          <p className="muted" style={{ marginTop: 'var(--space-3)' }}>Loading global macro indicators…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card graphs-section">
        <button
          type="button"
          className="graphs-section-header"
          aria-expanded={false}
          aria-controls="global-charts-section-content"
        >
          <span className="graphs-section-chevron" aria-hidden>▸</span>
          <span className="graphs-section-title">Global Charts</span>
        </button>
        <div id="global-charts-section-content" className="graphs-section-content">
          <p className="muted" style={{ marginTop: 'var(--space-3)' }}>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card graphs-section">
      <button
        type="button"
        className="graphs-section-header"
        onClick={() => setSectionExpanded((e) => !e)}
        aria-expanded={sectionExpanded}
        aria-controls="global-charts-section-content"
      >
        <span className="graphs-section-chevron" aria-hidden>
          {sectionExpanded ? '▾' : '▸'}
        </span>
        <span className="graphs-section-title">Global Charts</span>
      </button>
      <div id="global-charts-section-content" className="graphs-section-content" hidden={!sectionExpanded}>
        <p className="muted graphs-section-methodology">
          Aggregated weighted global metrics: rates and shares use population- or GDP-weighted averages; ratios use world totals (e.g. debt/GDP); levels use world sums.
        </p>
        <div className="graphs-section-toolbar">
          <button
            type="button"
            className="graphs-section-toolbar-btn"
            onClick={allExpanded ? collapseAllSubsections : expandAllSubsections}
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
        <div className="graphs-subsections">
          {GRAPHS_SUBSECTION_CONFIG.map(({ id, label }) => {
            const isExpanded = subsectionsExpanded[id];
            return (
              <div key={id} className="graphs-subsection">
                <button
                  type="button"
                  className="graphs-subsection-header"
                  onClick={() => toggleSubsection(id)}
                  aria-expanded={isExpanded}
                  aria-controls={`global-charts-subsection-${id}`}
                >
                  <span className="graphs-subsection-chevron" aria-hidden>
                    {isExpanded ? '▾' : '▸'}
                  </span>
                  <span id={`global-charts-subsection-${id}-title`} className="graphs-subsection-title">{label}</span>
                </button>
                <div
                  id={`global-charts-subsection-${id}`}
                  className={`graphs-subsection-content ${isExpanded ? 'is-expanded' : ''}`}
                  hidden={!isExpanded}
                  role="region"
                  aria-labelledby={`global-charts-subsection-${id}-title`}
                >
                  {isExpanded && id === 'unified' && (
                    <div className="card timeseries-section dashboard-grid-full">
                      <div className="section-header">
                        <div>
                          <h2 className="section-title">{label}</h2>
                          <p className="muted">Global aggregates: weighted averages for rates/shares; world totals for levels.</p>
                        </div>
        <div className="section-header-controls">
          <div className="section-header-control-group">
            <div className="section-control-label">Frequency</div>
            <div
              className="frequency-toolbar"
              tabIndex={-1}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setIsFrequencyOpenUnified(false);
                }
              }}
            >
              <button
                type="button"
                className="map-metric-trigger"
                aria-haspopup="listbox"
                aria-expanded={isFrequencyOpenUnified}
                onClick={() => setIsFrequencyOpenUnified((open) => !open)}
              >
                <span className="map-metric-trigger-icon">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M5 1.5a.75.75 0 0 1 .75.75V3h4.5V2.25a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v8.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-8.5A1.75 1.75 0 0 1 3.75 3h.5V2.25A.75.75 0 0 1 5 1.5Zm7 5H4a.5.5 0 0 0-.5.5v6.25c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V7a.5.5 0 0 0-.5-.5Z" />
                  </svg>
                </span>
                <span className="map-metric-trigger-label">
                  {FREQUENCY_LABELS[frequencyUnified]}
                </span>
                <span
                  className={`map-metric-trigger-chevron ${isFrequencyOpenUnified ? 'open' : ''}`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.53a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </span>
              </button>
              {isFrequencyOpenUnified && (
                <div className="map-metric-dropdown" role="listbox">
                  <div className="map-metric-category">
                    <div className="map-metric-category-header">
                      <span className="map-metric-category-icon">
                        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-6.5Z" />
                        </svg>
                      </span>
                      <span>Sampling cadence</span>
                    </div>
                    <div className="map-metric-category-items">
                      {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={`map-metric-option ${frequencyUnified === f ? 'selected' : ''}`}
                          onClick={() => {
                            setFrequencyUnified(f);
                            setIsFrequencyOpenUnified(false);
                          }}
                        >
                          <span className="map-metric-option-icon">
                            {frequencyUnified === f && (
                              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                <path d="M6.5 10.293 4.354 8.146a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5-5a.5.5 0 0 0-.708-.708L6.5 10.293Z" />
                              </svg>
                            )}
                          </span>
                          <span>{FREQUENCY_LABELS[f]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="section-header-control-group">
            <div className="section-control-label">View</div>
            <div className="pill-group pill-group-secondary">
              <button
                type="button"
                className={`pill ${viewModeUnified === 'chart' ? 'pill-active' : ''}`}
                onClick={() => setViewModeUnified('chart')}
              >
                <span className="icon-12">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M2.75 3A.75.75 0 0 0 2 3.75v8.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75v-8.5A.75.75 0 0 0 14.25 3h-11.5Zm.75 1.5h10v7H3.5v-7Zm1.75 1a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Zm3 1a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 .75-.75Zm3 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z" />
                  </svg>
                </span>
                <span>Chart view</span>
              </button>
              <button
                type="button"
                className={`pill ${viewModeUnified === 'table' ? 'pill-active' : ''}`}
                onClick={() => setViewModeUnified('table')}
              >
                <span className="icon-12">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z" />
                  </svg>
                </span>
                <span>Table view</span>
              </button>
            </div>
          </div>
          <div className="section-header-control-group">
            <div className="section-control-label">Export</div>
            <div className="pill-group pill-group-secondary">
              {viewModeUnified === 'chart' && (
                <button
                  type="button"
                  className="pestel-chart-download-btn summary-download-icon-btn"
                  onClick={downloadUnifiedChartPng}
                  title="Download chart view as high-resolution PNG"
                  aria-label="Download chart view as high-resolution PNG"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                    <path
                      fill="currentColor"
                      d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L7.25 8.44V2.25A.75.75 0 0 1 8 1.5Zm-4 9a.75.75 0 0 1 .75.75v1.25c0 .14.11.25.25.25h6a.25.25 0 0 0 .25-.25v-1.25a.75.75 0 0 1 1.5 0v1.25A1.75 1.75 0 0 1 11 14.5H5A1.75 1.75 0 0 1 3.25 12.75v-1.25A.75.75 0 0 1 4 10.5Z"
                    />
                  </svg>
                </button>
              )}
              {viewModeUnified === 'table' && (
                <button
                  type="button"
                  className="pestel-chart-download-btn summary-download-icon-btn"
                  onClick={downloadUnifiedCsv}
                  title="Export table data as CSV"
                  aria-label="Export table data as CSV"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                    <path
                      fill="currentColor"
                      d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="metric-toggle-row-header">
        <div className="metric-toggle-title">Metrics displayed</div>
        <div className="metric-toggle-hint">Tap to show or hide indicators</div>
      </div>
      <div className="metric-toggle-row">
        {UNIFIED_TIMELINE_METRIC_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`tag ${selectedUnifiedMetricIds.includes(id) ? 'tag-active' : ''}`}
            onClick={() => {
              if (selectedUnifiedMetricIds.includes(id)) {
                setSelectedUnifiedMetricIds(selectedUnifiedMetricIds.filter((m) => m !== id));
              } else {
                setSelectedUnifiedMetricIds([...selectedUnifiedMetricIds, id]);
              }
            }}
          >
            <span
              className="tag-swatch"
              style={{ backgroundColor: UNIFIED_TIMELINE_COLORS[id] }}
            />
            {GLOBAL_UNIFIED_LEGEND_LABELS[id] ?? labelByMetricIdUnified[id] ?? id}
          </button>
        ))}
      </div>

      <div id="global-unified-chart-wrapper">
      {viewModeUnified === 'chart' ? (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={mergedUnified}
              margin={{ top: 12, right: 24, bottom: 24, left: 8 }}
            >
              <CartesianGrid
                stroke="rgba(148,163,184,0.25)"
                vertical={false}
              />
              <XAxis
                dataKey={xKeyUnified}
                ticks={xTicksUnified}
                tickFormatter={formatAxisLabelUnified}
                tickLine={false}
                tickMargin={8}
                stroke="rgba(148,163,184,0.9)"
                tick={{
                  fontSize: 10,
                  fill: 'rgba(55,65,81,0.9)',
                }}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => formatCompactNumber(v as number)}
                tickLine={false}
                tickMargin={8}
                stroke="rgba(148,163,184,0.9)"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => formatCompactNumber(v as number)}
                tickLine={false}
                tickMargin={8}
                stroke="rgba(148,163,184,0.9)"
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid rgba(148,163,184,0.6)',
                  borderRadius: 8,
                  boxShadow: '0 10px 30px rgba(15,23,42,0.16)',
                }}
                content={
                  <CustomTooltip
                    mergedOverride={mergedUnified}
                    xKeyOverride={xKeyUnified}
                    labelByMetricIdOverride={labelByMetricIdUnified}
                    selectedMetricIdsOverride={selectedUnifiedMetricIds}
                    frequencyOverride={frequencyUnified}
                    formatAxisLabelOverride={formatAxisLabelUnified}
                    metricIdsOverride={UNIFIED_TIMELINE_METRIC_IDS}
                    freqLabelOverride={freqLabelUnified}
                  />
                }
              />
              {UNIFIED_TIMELINE_METRIC_IDS.map((metricId) => (
                <Line
                  key={metricId}
                  type="monotone"
                  dataKey={metricId}
                  stroke={UNIFIED_TIMELINE_COLORS[metricId]}
                  strokeWidth={2}
                  dot={false}
                  hide={
                    !selectedUnifiedMetricIds.includes(metricId) ||
                    !mergedUnified.some((row) => row[metricId] != null)
                  }
                  yAxisId={UNIFIED_TIMELINE_RIGHT_AXIS.includes(metricId) ? 'right' : 'left'}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-table-wrapper">
          <div className="chart-table-scroll">
            <table className="chart-table">
              <thead>
                <tr>
                  <th>{frequencyUnified === 'yearly' ? 'Year' : 'Period'}</th>
                  {selectedUnifiedMetricIds.map((id) => (
                    <th key={id}>{labelByMetricIdUnified[id] ?? id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mergedUnified.map((row, rowIndex) => (
                  <tr key={String(row[xKeyUnified])}>
                    <td>{formatAxisLabelUnified(row[xKeyUnified] as string | number)}</td>
                    {selectedUnifiedMetricIds.map((id) => {
                      const v = row[id];
                      const prevRow = rowIndex > 0 ? mergedUnified[rowIndex - 1] : undefined;
                      const prev = prevRow && prevRow[id] != null ? (prevRow[id] as number) : null;

                      let changeText: string | null = null;
                      let changeDir: 'up' | 'down' | 'flat' | null = null;
                      if (v != null) {
                        changeText = formatGrowthChange(v as number, prev ?? null, freqLabelUnified[frequencyUnified], id);
                        if (changeText) {
                          const diff = (v as number) - (prev ?? 0);
                          if (isPercentageMetric(id)) {
                            if (diff > 0.05) changeDir = 'up';
                            else if (diff < -0.05) changeDir = 'down';
                            else changeDir = 'flat';
                          } else if (prev != null && prev !== 0) {
                            const pct = (diff / Math.abs(prev)) * 100;
                            if (pct > 0.05) changeDir = 'up';
                            else if (pct < -0.05) changeDir = 'down';
                            else changeDir = 'flat';
                          }
                        }
                      }

                      return (
                        <td key={id}>
                          {v == null ? (
                            '–'
                          ) : (
                            <div className="table-metric-cell">
                              <div className="table-metric-value">
                                {formatCompactNumber(v as number)}
                              </div>
                              {changeText && changeDir && (
                                <div
                                  className={`table-metric-change table-metric-change-${changeDir}`}
                                >
                                  {changeText}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

                    </div>
                  )}
                  {isExpanded && id === 'macroEconomic' && (
                    <div className="card timeseries-section dashboard-grid-full">
                      <div className="section-header" style={{ marginTop: 0 }}>
                        <div>
                          <h2 className="section-title">{label}</h2>
                          <p className="muted">Global aggregates: weighted averages for rates/shares; world totals for levels.</p>
                        </div>
        <div className="section-header-controls">
          <div className="section-header-control-group">
            <div className="section-control-label">Frequency</div>
            <div
              className="frequency-toolbar"
              tabIndex={-1}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setIsFrequencyOpen(false);
                }
              }}
            >
              <button
                type="button"
                className="map-metric-trigger"
                aria-haspopup="listbox"
                aria-expanded={isFrequencyOpen}
                onClick={() => setIsFrequencyOpen((open) => !open)}
              >
                <span className="map-metric-trigger-icon">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M5 1.5a.75.75 0 0 1 .75.75V3h4.5V2.25a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v8.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-8.5A1.75 1.75 0 0 1 3.75 3h.5V2.25A.75.75 0 0 1 5 1.5Zm7 5H4a.5.5 0 0 0-.5.5v6.25c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V7a.5.5 0 0 0-.5-.5Z" />
                  </svg>
                </span>
                <span className="map-metric-trigger-label">
                  {FREQUENCY_LABELS[frequency]}
                </span>
                <span
                  className={`map-metric-trigger-chevron ${isFrequencyOpen ? 'open' : ''}`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.53a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </span>
              </button>
              {isFrequencyOpen && (
                <div className="map-metric-dropdown" role="listbox">
                  <div className="map-metric-category">
                    <div className="map-metric-category-header">
                      <span className="map-metric-category-icon">
                        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-6.5Z" />
                        </svg>
                      </span>
                      <span>Sampling cadence</span>
                    </div>
                    <div className="map-metric-category-items">
                      {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={`map-metric-option ${frequency === f ? 'selected' : ''}`}
                          onClick={() => {
                            setFrequency(f);
                            setIsFrequencyOpen(false);
                          }}
                        >
                          <span className="map-metric-option-icon">
                            {frequency === f && (
                              <svg
                                viewBox="0 0 16 16"
                                aria-hidden="true"
                                focusable="false"
                              >
                                <path d="M6.5 10.293 4.354 8.146a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5-5a.5.5 0 0 0-.708-.708L6.5 10.293Z" />
                              </svg>
                            )}
                          </span>
                          <span>{FREQUENCY_LABELS[f]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="section-header-control-group">
            <div className="section-control-label">View</div>
            <div className="pill-group pill-group-secondary">
              <button
                type="button"
                className={`pill ${viewMode === 'chart' ? 'pill-active' : ''}`}
                onClick={() => setViewMode('chart')}
              >
                <span className="icon-12">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M2.75 3A.75.75 0 0 0 2 3.75v8.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75v-8.5A.75.75 0 0 0 14.25 3h-11.5Zm.75 1.5h10v7H3.5v-7Zm1.75 1a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Zm3 1a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 .75-.75Zm3 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z" />
                  </svg>
                </span>
                <span>Chart view</span>
              </button>
              <button
                type="button"
                className={`pill ${viewMode === 'table' ? 'pill-active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <span className="icon-12">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z" />
                  </svg>
                </span>
                <span>Table view</span>
              </button>
            </div>
          </div>
          <div className="section-header-control-group">
            <div className="section-control-label">Export</div>
            <div className="pill-group pill-group-secondary">
              {viewMode === 'chart' && (
                <button
                  type="button"
                  className="pestel-chart-download-btn summary-download-icon-btn"
                  onClick={downloadEconomicChartPng}
                  title="Download chart view as high-resolution PNG"
                  aria-label="Download chart view as high-resolution PNG"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                    <path
                      fill="currentColor"
                      d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L7.25 8.44V2.25A.75.75 0 0 1 8 1.5Zm-4 9a.75.75 0 0 1 .75.75v1.25c0 .14.11.25.25.25h6a.25.25 0 0 0 .25-.25v-1.25a.75.75 0 0 1 1.5 0v1.25A1.75 1.75 0 0 1 11 14.5H5A1.75 1.75 0 0 1 3.25 12.75v-1.25A.75.75 0 0 1 4 10.5Z"
                    />
                  </svg>
                </button>
              )}
              {viewMode === 'table' && (
                <button
                  type="button"
                  className="pestel-chart-download-btn summary-download-icon-btn"
                  onClick={downloadEconomicCsv}
                  title="Export table data as CSV"
                  aria-label="Export table data as CSV"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                    <path
                      fill="currentColor"
                      d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="metric-toggle-row-header">
        <div className="metric-toggle-title">Metrics displayed</div>
        <div className="metric-toggle-hint">Tap to show or hide indicators</div>
      </div>
      <div className="metric-toggle-row">
        {ECONOMIC_METRIC_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`tag ${selectedMetricIds.includes(id) ? 'tag-active' : ''}`}
            onClick={() => {
              if (selectedMetricIds.includes(id)) {
                setSelectedMetricIds(selectedMetricIds.filter((m) => m !== id));
              } else {
                setSelectedMetricIds([...selectedMetricIds, id]);
              }
            }}
          >
            <span
              className="tag-swatch"
              style={{ backgroundColor: METRIC_COLORS[id] }}
            />
            {GLOBAL_ECONOMIC_LABELS[id] === undefined
              ? labelByMetricId[id] ?? id
              : // simplified legend text
                ({
                  inflationCPI: 'Inflation',
                  govDebtPercentGDP: 'Gov. debt / GDP',
                  interestRate: 'Lending rate',
                  unemploymentRate: 'Unemployment rate',
                  povertyHeadcount215: 'Poverty at $2.15',
                  povertyHeadcountNational: 'Poverty (national line)',
                } as Record<string, string>)[id] ?? GLOBAL_ECONOMIC_LABELS[id]}
          </button>
        ))}
      </div>

      <div id="global-economic-chart-wrapper">
      {viewMode === 'chart' ? (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={merged}
              margin={{ top: 12, right: 24, bottom: 24, left: 8 }}
            >
              <CartesianGrid
                stroke="rgba(148,163,184,0.25)"
                vertical={false}
              />
              <XAxis
                dataKey={xKey}
                ticks={xTicks}
                tickFormatter={formatAxisLabel}
                tickLine={false}
                tickMargin={8}
                stroke="rgba(148,163,184,0.9)"
                tick={{
                  fontSize: 10,
                  fill: 'rgba(55,65,81,0.9)',
                }}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => formatCompactNumber(v as number)}
                tickLine={false}
                tickMargin={8}
                stroke="rgba(148,163,184,0.9)"
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid rgba(148,163,184,0.6)',
                  borderRadius: 8,
                  boxShadow: '0 10px 30px rgba(15,23,42,0.16)',
                }}
                content={<CustomTooltip />}
              />
              {ECONOMIC_METRIC_IDS.map((metricId) => (
                <Line
                  key={metricId}
                  type="monotone"
                  dataKey={metricId}
                  stroke={METRIC_COLORS[metricId]}
                  strokeWidth={2}
                  dot={false}
                  hide={
                    !selectedMetricIds.includes(metricId) ||
                    !merged.some((row) => row[metricId] != null)
                  }
                  yAxisId="left"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-table-wrapper">
          <div className="chart-table-scroll">
            <table className="chart-table">
              <thead>
                <tr>
                  <th>{frequency === 'yearly' ? 'Year' : 'Period'}</th>
                  {selectedMetricIds.map((id) => (
                    <th key={id}>{labelByMetricId[id] ?? id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {merged.map((row, rowIndex) => (
                  <tr key={String(row[xKey])}>
                    <td>{formatAxisLabel(row[xKey] as string | number)}</td>
                    {selectedMetricIds.map((id) => {
                      const v = row[id];
                      const prevRow = rowIndex > 0 ? merged[rowIndex - 1] : undefined;
                      const prev = prevRow && prevRow[id] != null ? (prevRow[id] as number) : null;

                      let changeText: string | null = null;
                      let changeDir: 'up' | 'down' | 'flat' | null = null;
                      if (v != null) {
                        changeText = formatGrowthChange(v as number, prev ?? null, freqLabel[frequency], id);
                        if (changeText) {
                          const diff = (v as number) - (prev ?? 0);
                          if (isPercentageMetric(id)) {
                            if (diff > 0.05) changeDir = 'up';
                            else if (diff < -0.05) changeDir = 'down';
                            else changeDir = 'flat';
                          } else if (prev != null && prev !== 0) {
                            const pct = (diff / Math.abs(prev)) * 100;
                            if (pct > 0.05) changeDir = 'up';
                            else if (pct < -0.05) changeDir = 'down';
                            else changeDir = 'flat';
                          }
                        }
                      }

                      return (
                        <td key={id}>
                          {v == null ? (
                            '–'
                          ) : (
                            <div className="table-metric-cell">
                              <div className="table-metric-value">
                                {formatCompactNumber(v as number)}
                              </div>
                              {changeText && changeDir && (
                                <div
                                  className={`table-metric-change table-metric-change-${changeDir}`}
                                >
                                  {changeText}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

                    </div>
                  )}
                  {isExpanded && id === 'macroHealth' && (
                    <div className="card timeseries-section dashboard-grid-full">
                      <div className="section-header" style={{ marginTop: 0 }}>
                        <div>
                          <h2 className="section-title">{label}</h2>
                          <p className="muted">Global aggregates: weighted averages for rates/shares; world totals for levels.</p>
                        </div>
        <div className="section-header-controls">
          <div className="section-header-control-group">
            <div className="section-control-label">Frequency</div>
            <div
              className="frequency-toolbar"
              tabIndex={-1}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setIsFrequencyOpenHealth(false);
                }
              }}
            >
              <button
                type="button"
                className="map-metric-trigger"
                aria-haspopup="listbox"
                aria-expanded={isFrequencyOpenHealth}
                onClick={() => setIsFrequencyOpenHealth((open) => !open)}
              >
                <span className="map-metric-trigger-icon">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M5 1.5a.75.75 0 0 1 .75.75V3h4.5V2.25a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v8.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-8.5A1.75 1.75 0 0 1 3.75 3h.5V2.25A.75.75 0 0 1 5 1.5Zm7 5H4a.5.5 0 0 0-.5.5v6.25c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V7a.5.5 0 0 0-.5-.5Z" />
                  </svg>
                </span>
                <span className="map-metric-trigger-label">
                  {FREQUENCY_LABELS[frequencyHealth]}
                </span>
                <span
                  className={`map-metric-trigger-chevron ${isFrequencyOpenHealth ? 'open' : ''}`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.53a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </span>
              </button>
              {isFrequencyOpenHealth && (
                <div className="map-metric-dropdown" role="listbox">
                  <div className="map-metric-category">
                    <div className="map-metric-category-header">
                      <span className="map-metric-category-icon">
                        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-6.5Z" />
                        </svg>
                      </span>
                      <span>Sampling cadence</span>
                    </div>
                    <div className="map-metric-category-items">
                      {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={`map-metric-option ${frequencyHealth === f ? 'selected' : ''}`}
                          onClick={() => {
                            setFrequencyHealth(f);
                            setIsFrequencyOpenHealth(false);
                          }}
                        >
                          <span className="map-metric-option-icon">
                            {frequencyHealth === f && (
                              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                <path d="M6.5 10.293 4.354 8.146a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5-5a.5.5 0 0 0-.708-.708L6.5 10.293Z" />
                              </svg>
                            )}
                          </span>
                          <span>{FREQUENCY_LABELS[f]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="section-header-control-group">
            <div className="section-control-label">View</div>
            <div className="pill-group pill-group-secondary">
              <button
                type="button"
                className={`pill ${viewModeHealth === 'chart' ? 'pill-active' : ''}`}
                onClick={() => setViewModeHealth('chart')}
              >
                <span className="icon-12">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M2.75 3A.75.75 0 0 0 2 3.75v8.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75v-8.5A.75.75 0 0 0 14.25 3h-11.5Zm.75 1.5h10v7H3.5v-7Zm1.75 1a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Zm3 1a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 .75-.75Zm3 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z" />
                  </svg>
                </span>
                <span>Chart view</span>
              </button>
              <button
                type="button"
                className={`pill ${viewModeHealth === 'table' ? 'pill-active' : ''}`}
                onClick={() => setViewModeHealth('table')}
              >
                <span className="icon-12">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z" />
                  </svg>
                </span>
                <span>Table view</span>
              </button>
            </div>
          </div>
          <div className="section-header-control-group">
            <div className="section-control-label">Export</div>
            <div className="pill-group pill-group-secondary">
              {viewModeHealth === 'chart' && (
                <button
                  type="button"
                  className="pestel-chart-download-btn summary-download-icon-btn"
                  onClick={downloadHealthChartPng}
                  title="Download chart view as high-resolution PNG"
                  aria-label="Download chart view as high-resolution PNG"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                    <path
                      fill="currentColor"
                      d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L7.25 8.44V2.25A.75.75 0 0 1 8 1.5Zm-4 9a.75.75 0 0 1 .75.75v1.25c0 .14.11.25.25.25h6a.25.25 0 0 0 .25-.25v-1.25a.75.75 0 0 1 1.5 0v1.25A1.75 1.75 0 0 1 11 14.5H5A1.75 1.75 0 0 1 3.25 12.75v-1.25A.75.75 0 0 1 4 10.5Z"
                    />
                  </svg>
                </button>
              )}
              {viewModeHealth === 'table' && (
                <button
                  type="button"
                  className="pestel-chart-download-btn summary-download-icon-btn"
                  onClick={downloadHealthCsv}
                  title="Export table data as CSV"
                  aria-label="Export table data as CSV"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                    <path
                      fill="currentColor"
                      d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="metric-toggle-row-header">
        <div className="metric-toggle-title">Metrics displayed</div>
        <div className="metric-toggle-hint">Tap to show or hide indicators</div>
      </div>
      <div className="metric-toggle-row">
        {HEALTH_METRIC_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`tag ${selectedHealthMetricIds.includes(id) ? 'tag-active' : ''}`}
            onClick={() => {
              if (selectedHealthMetricIds.includes(id)) {
                setSelectedHealthMetricIds(selectedHealthMetricIds.filter((m) => m !== id));
              } else {
                setSelectedHealthMetricIds([...selectedHealthMetricIds, id]);
              }
            }}
          >
            <span
              className="tag-swatch"
              style={{ backgroundColor: HEALTH_COLORS[id] }}
            />
            {GLOBAL_HEALTH_LEGEND_LABELS[id] ?? GLOBAL_HEALTH_LABELS[id] ?? id}
          </button>
        ))}
      </div>

      <div id="global-health-chart-wrapper">
      {viewModeHealth === 'chart' ? (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={mergedHealth}
              margin={{ top: 12, right: 24, bottom: 24, left: 8 }}
            >
              <CartesianGrid
                stroke="rgba(148,163,184,0.25)"
                vertical={false}
              />
              <XAxis
                dataKey={xKeyHealth}
                ticks={xTicksHealth}
                tickFormatter={formatAxisLabelHealth}
                tickLine={false}
                tickMargin={8}
                stroke="rgba(148,163,184,0.9)"
                tick={{
                  fontSize: 10,
                  fill: 'rgba(55,65,81,0.9)',
                }}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) =>
                  typeof v === 'number'
                    ? (v >= 1e6
                        ? `${(v / 1e6).toFixed(1)}M`
                        : v >= 1e3
                          ? `${(v / 1e3).toFixed(1)}k`
                          : v.toFixed(1))
                    : String(v)
                }
                tickLine={false}
                tickMargin={8}
                stroke="rgba(148,163,184,0.9)"
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid rgba(148,163,184,0.6)',
                  borderRadius: 8,
                  boxShadow: '0 10px 30px rgba(15,23,42,0.16)',
                }}
                content={
                  <CustomTooltip
                    mergedOverride={mergedHealth}
                    xKeyOverride={xKeyHealth}
                    labelByMetricIdOverride={labelByMetricIdHealth}
                    selectedMetricIdsOverride={selectedHealthMetricIds}
                    frequencyOverride={frequencyHealth}
                    formatAxisLabelOverride={formatAxisLabelHealth}
                    metricIdsOverride={HEALTH_METRIC_IDS}
                    freqLabelOverride={freqLabelHealth}
                    formatValueOverride={(id, v) =>
                      id === 'lifeExpectancy'
                        ? (v != null ? Number(v).toFixed(1) : '–')
                        : v != null
                          ? Number(v).toFixed(2)
                          : '–'
                    }
                  />
                }
              />
              {HEALTH_METRIC_IDS.map((metricId) => (
                <Line
                  key={metricId}
                  type="monotone"
                  dataKey={metricId}
                  stroke={HEALTH_COLORS[metricId]}
                  strokeWidth={2}
                  dot={false}
                  hide={
                    !selectedHealthMetricIds.includes(metricId) ||
                    !mergedHealth.some((row) => row[metricId] != null)
                  }
                  yAxisId="left"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-table-wrapper">
          <div className="chart-table-scroll">
            <table className="chart-table">
              <thead>
                <tr>
                  <th>{frequencyHealth === 'yearly' ? 'Year' : 'Period'}</th>
                  {selectedHealthMetricIds.map((id) => (
                    <th key={id}>{GLOBAL_HEALTH_LABELS[id] ?? id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mergedHealth.map((row, rowIndex) => (
                  <tr key={String(row[xKeyHealth])}>
                    <td>{formatAxisLabelHealth(row[xKeyHealth] as string | number)}</td>
                    {selectedHealthMetricIds.map((id) => {
                      const v = row[id];
                      const prevRow = rowIndex > 0 ? mergedHealth[rowIndex - 1] : undefined;
                      const prev = prevRow && prevRow[id] != null ? (prevRow[id] as number) : null;

                      let changeText: string | null = null;
                      let changeDir: 'up' | 'down' | 'flat' | null = null;
                      if (v != null) {
                        changeText = formatGrowthChange(v as number, prev ?? null, freqLabelHealth[frequencyHealth], id);
                        if (changeText) {
                          const diff = (v as number) - (prev ?? 0);
                          if (isPercentageMetric(id)) {
                            if (diff > 0.05) changeDir = 'up';
                            else if (diff < -0.05) changeDir = 'down';
                            else changeDir = 'flat';
                          } else if (prev != null && prev !== 0) {
                            const pct = (diff / Math.abs(prev)) * 100;
                            if (pct > 0.05) changeDir = 'up';
                            else if (pct < -0.05) changeDir = 'down';
                            else changeDir = 'flat';
                          }
                        }
                      }

                      const display =
                        id === 'lifeExpectancy'
                          ? v == null ? '–' : Number(v).toFixed(1)
                          : v == null ? '–' : formatCompactNumber(v as number);

                      return (
                        <td key={id}>
                          {v == null ? (
                            '–'
                          ) : (
                            <div className="table-metric-cell">
                              <div className="table-metric-value">
                                {display}
                              </div>
                              {changeText && changeDir && (
                                <div
                                  className={`table-metric-change table-metric-change-${changeDir}`}
                                >
                                  {changeText}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

                    </div>
                  )}
                  {isExpanded && id === 'populationStructure' && (
                    <div className="card timeseries-section dashboard-grid-full">
                      <div className="section-header" style={{ marginTop: 0 }}>
                        <div>
                          <h2 className="section-title">{label}</h2>
                          <p className="muted">Global aggregates: weighted averages for rates/shares; world totals for levels.</p>
                        </div>
        <div className="section-header-controls">
          <div className="section-header-control-group">
            <div className="section-control-label">Frequency</div>
            <div
              className="frequency-toolbar"
              tabIndex={-1}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setIsFrequencyOpenPop(false);
                }
              }}
            >
              <button
                type="button"
                className="map-metric-trigger"
                aria-haspopup="listbox"
                aria-expanded={isFrequencyOpenPop}
                onClick={() => setIsFrequencyOpenPop((open) => !open)}
              >
                <span className="map-metric-trigger-icon">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M5 1.5a.75.75 0 0 1 .75.75V3h4.5V2.25a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v8.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-8.5A1.75 1.75 0 0 1 3.75 3h.5V2.25A.75.75 0 0 1 5 1.5Zm7 5H4a.5.5 0 0 0-.5.5v6.25c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V7a.5.5 0 0 0-.5-.5Z" />
                  </svg>
                </span>
                <span className="map-metric-trigger-label">
                  {FREQUENCY_LABELS[frequencyPop]}
                </span>
                <span
                  className={`map-metric-trigger-chevron ${isFrequencyOpenPop ? 'open' : ''}`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.53a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </span>
              </button>
              {isFrequencyOpenPop && (
                <div className="map-metric-dropdown" role="listbox">
                  <div className="map-metric-category">
                    <div className="map-metric-category-header">
                      <span className="map-metric-category-icon">
                        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-6.5Z" />
                        </svg>
                      </span>
                      <span>Sampling cadence</span>
                    </div>
                    <div className="map-metric-category-items">
                      {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={`map-metric-option ${frequencyPop === f ? 'selected' : ''}`}
                          onClick={() => {
                            setFrequencyPop(f);
                            setIsFrequencyOpenPop(false);
                          }}
                        >
                          <span className="map-metric-option-icon">
                            {frequencyPop === f && (
                              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                <path d="M6.5 10.293 4.354 8.146a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5-5a.5.5 0 0 0-.708-.708L6.5 10.293Z" />
                              </svg>
                            )}
                          </span>
                          <span>{FREQUENCY_LABELS[f]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="section-header-control-group">
            <div className="section-control-label">View</div>
            <div className="pill-group pill-group-secondary">
              <button
                type="button"
                className={`pill ${viewModePop === 'chart' ? 'pill-active' : ''}`}
                onClick={() => setViewModePop('chart')}
              >
                <span className="icon-12">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M2.75 3A.75.75 0 0 0 2 3.75v8.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75v-8.5A.75.75 0 0 0 14.25 3h-11.5Zm.75 1.5h10v7H3.5v-7Zm1.75 1a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Zm3 1a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 .75-.75Zm3 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z" />
                  </svg>
                </span>
                <span>Chart view</span>
              </button>
              <button
                type="button"
                className={`pill ${viewModePop === 'table' ? 'pill-active' : ''}`}
                onClick={() => setViewModePop('table')}
              >
                <span className="icon-12">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z" />
                  </svg>
                </span>
                <span>Table view</span>
              </button>
            </div>
          </div>
          <div className="section-header-control-group">
            <div className="section-control-label">Export</div>
            <div className="pill-group pill-group-secondary">
              {viewModePop === 'chart' && (
                <button
                  type="button"
                  className="pestel-chart-download-btn summary-download-icon-btn"
                  onClick={downloadPopChartPng}
                  title="Download chart view as high-resolution PNG"
                  aria-label="Download chart view as high-resolution PNG"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                    <path
                      fill="currentColor"
                      d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L7.25 8.44V2.25A.75.75 0 0 1 8 1.5Zm-4 9a.75.75 0 0 1 .75.75v1.25c0 .14.11.25.25.25h6a.25.25 0 0 0 .25-.25v-1.25a.75.75 0 0 1 1.5 0v1.25A1.75 1.75 0 0 1 11 14.5H5A1.75 1.75 0 0 1 3.25 12.75v-1.25A.75.75 0 0 1 4 10.5Z"
                    />
                  </svg>
                </button>
              )}
              {viewModePop === 'table' && (
                <button
                  type="button"
                  className="pestel-chart-download-btn summary-download-icon-btn"
                  onClick={downloadPopCsv}
                  title="Export table data as CSV"
                  aria-label="Export table data as CSV"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                    <path
                      fill="currentColor"
                      d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="metric-toggle-row-header">
        <div className="metric-toggle-title">Metrics displayed</div>
        <div className="metric-toggle-hint">Tap to show or hide indicators</div>
      </div>
      <div className="metric-toggle-row">
        {POP_STRUCTURE_METRIC_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`tag ${selectedPopMetricIds.includes(id) ? 'tag-active' : ''}`}
            onClick={() => {
              if (selectedPopMetricIds.includes(id)) {
                setSelectedPopMetricIds(selectedPopMetricIds.filter((m) => m !== id));
              } else {
                setSelectedPopMetricIds([...selectedPopMetricIds, id]);
              }
            }}
          >
            <span
              className="tag-swatch"
              style={{ backgroundColor: POP_STRUCTURE_COLORS[id] }}
            />
            {GLOBAL_POP_STRUCTURE_LEGEND_LABELS[id] ?? GLOBAL_POP_STRUCTURE_LABELS[id] ?? id}
          </button>
        ))}
      </div>

      <div id="global-population-structure-chart-wrapper">
      {viewModePop === 'chart' ? (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={mergedPop}
              margin={{ top: 12, right: 24, bottom: 24, left: 8 }}
            >
              <CartesianGrid
                stroke="rgba(148,163,184,0.25)"
                vertical={false}
              />
              <XAxis
                dataKey={xKeyPop}
                ticks={xTicksPop}
                tickFormatter={formatAxisLabelPop}
                tickLine={false}
                tickMargin={8}
                stroke="rgba(148,163,184,0.9)"
                tick={{
                  fontSize: 10,
                  fill: 'rgba(55,65,81,0.9)',
                }}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => formatPercentage(v as number)}
                tickLine={false}
                tickMargin={8}
                stroke="rgba(148,163,184,0.9)"
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid rgba(148,163,184,0.6)',
                  borderRadius: 8,
                  boxShadow: '0 10px 30px rgba(15,23,42,0.16)',
                }}
                content={
                  <CustomTooltip
                    mergedOverride={mergedPop}
                    xKeyOverride={xKeyPop}
                    labelByMetricIdOverride={labelByMetricIdPop}
                    selectedMetricIdsOverride={selectedPopMetricIds}
                    frequencyOverride={frequencyPop}
                    formatAxisLabelOverride={formatAxisLabelPop}
                    metricIdsOverride={POP_STRUCTURE_METRIC_IDS}
                    freqLabelOverride={freqLabelPop}
                    formatValueOverride={(_id, v) => (v != null ? formatPercentage(v) : '–')}
                    absoluteKeyByMetricId={shareToAbsoluteIdPop}
                  />
                }
              />
              {POP_STRUCTURE_METRIC_IDS.map((metricId) => (
                <Line
                  key={metricId}
                  type="monotone"
                  dataKey={metricId}
                  stroke={POP_STRUCTURE_COLORS[metricId]}
                  strokeWidth={2}
                  dot={false}
                  hide={
                    !selectedPopMetricIds.includes(metricId) ||
                    !mergedPop.some((row) => row[metricId] != null)
                  }
                  yAxisId="left"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-table-wrapper">
          <div className="chart-table-scroll">
            <table className="chart-table">
              <thead>
                <tr>
                  <th>{frequencyPop === 'yearly' ? 'Year' : 'Period'}</th>
                  {selectedPopMetricIds.map((id) => (
                    <th key={id}>{GLOBAL_POP_STRUCTURE_LABELS[id] ?? id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mergedPop.map((row, rowIndex) => (
                  <tr key={String(row[xKeyPop])}>
                    <td>{formatAxisLabelPop(row[xKeyPop] as string | number)}</td>
                    {selectedPopMetricIds.map((id) => {
                      const v = row[id];
                      const absVal = row[shareToAbsoluteIdPop[id]];
                      const prevRow = rowIndex > 0 ? mergedPop[rowIndex - 1] : undefined;
                      const prev = prevRow && prevRow[id] != null ? (prevRow[id] as number) : null;

                      let changeText: string | null = null;
                      let changeDir: 'up' | 'down' | 'flat' | null = null;
                      if (v != null) {
                        changeText = formatGrowthChange(v as number, prev ?? null, freqLabelPop[frequencyPop], id);
                        if (changeText) {
                          const diff = (v as number) - (prev ?? 0);
                          if (isPercentageMetric(id)) {
                            if (diff > 0.05) changeDir = 'up';
                            else if (diff < -0.05) changeDir = 'down';
                            else changeDir = 'flat';
                          } else if (prev != null && prev !== 0) {
                            const pct = (diff / Math.abs(prev)) * 100;
                            if (pct > 0.05) changeDir = 'up';
                            else if (pct < -0.05) changeDir = 'down';
                            else changeDir = 'flat';
                          }
                        }
                      }

                      return (
                        <td key={id}>
                          {v == null ? (
                            '–'
                          ) : (
                            <div className="table-metric-cell">
                              <div className="table-metric-value">
                                {formatPercentage(v as number)}
                                {absVal != null && Number.isFinite(absVal) && (
                                  <div className="table-metric-absolute">
                                    {formatCompactNumber(absVal as number)}
                                  </div>
                                )}
                              </div>
                              {changeText && changeDir && (
                                <div
                                  className={`table-metric-change table-metric-change-${changeDir}`}
                                >
                                  {changeText}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

                    </div>
                  )}
                  {isExpanded && id === 'educationOOS' && (
                    <div className="card timeseries-section dashboard-grid-full">
                      <div className="section-header" style={{ marginTop: 0 }}>
                        <div>
                          <h2 className="section-title">{label}</h2>
                          <p className="muted">Global aggregates: weighted averages for rates/shares; world totals for levels.</p>
                        </div>
                        <div className="section-header-controls">
                          <div className="section-header-control-group">
                            <div className="section-control-label">Frequency</div>
                            <div className="frequency-toolbar" tabIndex={-1} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsFrequencyOpenEduOOS(false); }}>
                              <button type="button" className="map-metric-trigger" aria-haspopup="listbox" aria-expanded={isFrequencyOpenEduOOS} onClick={() => setIsFrequencyOpenEduOOS((o) => !o)}>
                                <span className="map-metric-trigger-icon"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 1.5a.75.75 0 0 1 .75.75V3h4.5V2.25a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v8.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-8.5A1.75 1.75 0 0 1 3.75 3h.5V2.25A.75.75 0 0 1 5 1.5Zm7 5H4a.5.5 0 0 0-.5.5v6.25c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V7a.5.5 0 0 0-.5-.5Z" /></svg></span>
                                <span className="map-metric-trigger-label">{FREQUENCY_LABELS[frequencyEduOOS]}</span>
                                <span className={`map-metric-trigger-chevron ${isFrequencyOpenEduOOS ? 'open' : ''}`} aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.53a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" /></svg></span>
                              </button>
                              {isFrequencyOpenEduOOS && (
                                <div className="map-metric-dropdown" role="listbox">
                                  <div className="map-metric-category">
                                    <div className="map-metric-category-header"><span className="map-metric-category-icon"><svg viewBox="0 0 16 16"><path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Z" /></svg></span><span>Sampling cadence</span></div>
                                    <div className="map-metric-category-items">
                                      {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                                        <button key={f} type="button" className={`map-metric-option ${frequencyEduOOS === f ? 'selected' : ''}`} onClick={() => { setFrequencyEduOOS(f); setIsFrequencyOpenEduOOS(false); }}>
                                          <span className="map-metric-option-icon">{frequencyEduOOS === f && <svg viewBox="0 0 16 16"><path d="M6.5 10.293 4.354 8.146a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5-5a.5.5 0 0 0-.708-.708L6.5 10.293Z" /></svg>}</span>
                                          <span>{FREQUENCY_LABELS[f]}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="section-header-control-group">
                            <div className="section-control-label">View</div>
                            <div className="pill-group pill-group-secondary">
                              <button type="button" className={`pill ${viewModeEduOOS === 'chart' ? 'pill-active' : ''}`} onClick={() => setViewModeEduOOS('chart')}><span className="icon-12"><svg viewBox="0 0 16 16"><path d="M2.75 3A.75.75 0 0 0 2 3.75v8.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75v-8.5A.75.75 0 0 0 14.25 3h-11.5Z" /></svg></span><span>Chart view</span></button>
                              <button type="button" className={`pill ${viewModeEduOOS === 'table' ? 'pill-active' : ''}`} onClick={() => setViewModeEduOOS('table')}><span className="icon-12"><svg viewBox="0 0 16 16"><path d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25Z" /></svg></span><span>Table view</span></button>
                            </div>
                          </div>
                          <div className="section-header-control-group">
                            <div className="section-control-label">Export</div>
                            <div className="pill-group pill-group-secondary">
                              {viewModeEduOOS === 'chart' && (
                                <button
                                  type="button"
                                  className="pestel-chart-download-btn summary-download-icon-btn"
                                  onClick={downloadEduOOSChartPng}
                                  title="Download chart view as high-resolution PNG"
                                  aria-label="Download chart view as high-resolution PNG"
                                >
                                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                                    <path
                                      fill="currentColor"
                                      d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L7.25 8.44V2.25A.75.75 0 0 1 8 1.5Zm-4 9a.75.75 0 0 1 .75.75v1.25c0 .14.11.25.25.25h6a.25.25 0 0 0 .25-.25v-1.25a.75.75 0 0 1 1.5 0v1.25A1.75 1.75 0 0 1 11 14.5H5A1.75 1.75 0 0 1 3.25 12.75v-1.25A.75.75 0 0 1 4 10.5Z"
                                    />
                                  </svg>
                                </button>
                              )}
                              {viewModeEduOOS === 'table' && (
                                <button
                                  type="button"
                                  className="pestel-chart-download-btn summary-download-icon-btn"
                                  onClick={downloadEduOOSCsv}
                                  title="Export table data as CSV"
                                  aria-label="Export table data as CSV"
                                >
                                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                                    <path
                                      fill="currentColor"
                                      d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="metric-toggle-row-header"><div className="metric-toggle-title">Metrics displayed</div><div className="metric-toggle-hint">Tap to show or hide indicators</div></div>
                      <div className="metric-toggle-row">
                        {EDUCATION_OOS_METRIC_IDS.map((mid) => (
                          <button key={mid} type="button" className={`tag ${selectedEduOOSMetricIds.includes(mid) ? 'tag-active' : ''}`} onClick={() => setSelectedEduOOSMetricIds(selectedEduOOSMetricIds.includes(mid) ? selectedEduOOSMetricIds.filter((m) => m !== mid) : [...selectedEduOOSMetricIds, mid])}>
                            <span className="tag-swatch" style={{ backgroundColor: EDUCATION_OOS_COLORS[mid] }} />
                            {GLOBAL_EDUCATION_OOS_LEGEND_LABELS[mid] ?? eduOOSData.labelByMetricId[mid] ?? mid}
                          </button>
                        ))}
                      </div>
                      <div id="global-education-oos-chart-wrapper">
                      {viewModeEduOOS === 'chart' ? (
                        <div className="chart-wrapper">
                          <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={eduOOSData.merged} margin={{ top: 12, right: 24, bottom: 24, left: 8 }}>
                              <CartesianGrid stroke="rgba(148,163,184,0.25)" vertical={false} />
                              <XAxis dataKey={eduOOSData.xKey} ticks={eduOOSData.xTicks} tickFormatter={eduOOSData.formatAxisLabel} tickLine={false} tickMargin={8} stroke="rgba(148,163,184,0.9)" tick={{ fontSize: 10, fill: 'rgba(55,65,81,0.9)' }} />
                              <YAxis tickFormatter={(v) => formatCompactNumber(v as number)} tickLine={false} tickMargin={8} stroke="rgba(148,163,184,0.9)" />
                              <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(148,163,184,0.6)', borderRadius: 8, boxShadow: '0 10px 30px rgba(15,23,42,0.16)' }} content={<CustomTooltip mergedOverride={eduOOSData.merged} xKeyOverride={eduOOSData.xKey} labelByMetricIdOverride={eduOOSData.labelByMetricId} selectedMetricIdsOverride={selectedEduOOSMetricIds} frequencyOverride={frequencyEduOOS} formatAxisLabelOverride={eduOOSData.formatAxisLabel} metricIdsOverride={EDUCATION_OOS_METRIC_IDS} freqLabelOverride={eduOOSData.freqLabel} />} />
                              {EDUCATION_OOS_METRIC_IDS.map((metricId) => (
                                <Line key={metricId} type="monotone" dataKey={metricId} stroke={EDUCATION_OOS_COLORS[metricId]} strokeWidth={2} dot={false} hide={!selectedEduOOSMetricIds.includes(metricId) || !eduOOSData.merged.some((row) => row[metricId] != null)} yAxisId="left" />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="chart-table-wrapper">
                          <div className="chart-table-scroll">
                            <table className="chart-table">
                              <thead>
                                <tr>
                                  <th>{frequencyEduOOS === 'yearly' ? 'Year' : 'Period'}</th>
                                  {selectedEduOOSMetricIds.map((id) => (<th key={id}>{eduOOSData.labelByMetricId[id] ?? id}</th>))}
                                </tr>
                              </thead>
                              <tbody>
                                {eduOOSData.merged.map((row, rowIndex) => (
                                  <tr key={String(row[eduOOSData.xKey])}>
                                    <td>{eduOOSData.formatAxisLabel(row[eduOOSData.xKey] as string | number)}</td>
                                    {selectedEduOOSMetricIds.map((id) => {
                                      const v = row[id];
                                      const prevRow = rowIndex > 0 ? eduOOSData.merged[rowIndex - 1] : undefined;
                                      const prev = prevRow && prevRow[id] != null ? (prevRow[id] as number) : null;
                                      let changeText: string | null = null;
                                      let changeDir: 'up' | 'down' | 'flat' | null = null;
                                      if (v != null) {
                                        changeText = formatGrowthChange(v as number, prev ?? null, eduOOSData.freqLabel[frequencyEduOOS], id);
                                        if (changeText) {
                                          const diff = (v as number) - (prev ?? 0);
                                          if (isPercentageMetric(id)) { if (diff > 0.05) changeDir = 'up'; else if (diff < -0.05) changeDir = 'down'; else changeDir = 'flat'; }
                                          else if (prev != null && prev !== 0) { const pct = (diff / Math.abs(prev)) * 100; if (pct > 0.05) changeDir = 'up'; else if (pct < -0.05) changeDir = 'down'; else changeDir = 'flat'; }
                                        }
                                      }
                                      return (
                                        <td key={id}>
                                          {v == null ? '–' : (
                                            <div className="table-metric-cell">
                                              <div className="table-metric-value">{formatCompactNumber(v as number)}</div>
                                              {changeText && changeDir && <div className={`table-metric-change table-metric-change-${changeDir}`}>{changeText}</div>}
                                            </div>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                  {isExpanded && id === 'educationEnrollment' && (
                    <div className="card timeseries-section dashboard-grid-full">
                      <div className="section-header" style={{ marginTop: 0 }}>
                        <div>
                          <h2 className="section-title">{label}</h2>
                          <p className="muted">Global aggregates: weighted averages for rates/shares; world totals for levels. Includes enrollment (total and % gross) and teaching workforce (teachers).</p>
                        </div>
                        <div className="section-header-controls">
                          <div className="section-header-control-group">
                            <div className="section-control-label">Frequency</div>
                            <div className="frequency-toolbar" tabIndex={-1} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsFrequencyOpenEduEnroll(false); }}>
                              <button type="button" className="map-metric-trigger" aria-haspopup="listbox" aria-expanded={isFrequencyOpenEduEnroll} onClick={() => setIsFrequencyOpenEduEnroll((o) => !o)}>
                                <span className="map-metric-trigger-icon"><svg viewBox="0 0 16 16"><path d="M5 1.5a.75.75 0 0 1 .75.75V3h4.5V2.25a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v8.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-8.5A1.75 1.75 0 0 1 3.75 3h.5V2.25A.75.75 0 0 1 5 1.5Z" /></svg></span>
                                <span className="map-metric-trigger-label">{FREQUENCY_LABELS[frequencyEduEnroll]}</span>
                                <span className={`map-metric-trigger-chevron ${isFrequencyOpenEduEnroll ? 'open' : ''}`} aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.53a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" /></svg></span>
                              </button>
                              {isFrequencyOpenEduEnroll && (
                                <div className="map-metric-dropdown" role="listbox">
                                  <div className="map-metric-category">
                                    <div className="map-metric-category-header"><span className="map-metric-category-icon"><svg viewBox="0 0 16 16"><path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Z" /></svg></span><span>Sampling cadence</span></div>
                                    <div className="map-metric-category-items">
                                          {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                                        <button key={f} type="button" className={`map-metric-option ${frequencyEduEnroll === f ? 'selected' : ''}`} onClick={() => { setFrequencyEduEnroll(f); setIsFrequencyOpenEduEnroll(false); }}>
                                          <span className="map-metric-option-icon">{frequencyEduEnroll === f && <svg viewBox="0 0 16 16"><path d="M6.5 10.293 4.354 8.146a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5-5a.5.5 0 0 0-.708-.708L6.5 10.293Z" /></svg>}</span>
                                          <span>{FREQUENCY_LABELS[f]}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="section-header-control-group">
                            <div className="section-control-label">View</div>
                            <div className="pill-group pill-group-secondary">
                              <button type="button" className={`pill ${viewModeEduEnroll === 'chart' ? 'pill-active' : ''}`} onClick={() => setViewModeEduEnroll('chart')}><span className="icon-12"><svg viewBox="0 0 16 16"><path d="M2.75 3A.75.75 0 0 0 2 3.75v8.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75v-8.5A.75.75 0 0 0 14.25 3h-11.5Z" /></svg></span><span>Chart view</span></button>
                              <button type="button" className={`pill ${viewModeEduEnroll === 'table' ? 'pill-active' : ''}`} onClick={() => setViewModeEduEnroll('table')}><span className="icon-12"><svg viewBox="0 0 16 16"><path d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25Z" /></svg></span><span>Table view</span></button>
                            </div>
                          </div>
                          <div className="section-header-control-group">
                            <div className="section-control-label">Export</div>
                            <div className="pill-group pill-group-secondary">
                              {viewModeEduEnroll === 'chart' && (
                                <button
                                  type="button"
                                  className="pestel-chart-download-btn summary-download-icon-btn"
                                  onClick={downloadEduEnrollChartPng}
                                  title="Download chart view as high-resolution PNG"
                                  aria-label="Download chart view as high-resolution PNG"
                                >
                                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                                    <path
                                      fill="currentColor"
                                      d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L7.25 8.44V2.25A.75.75 0 0 1 8 1.5Zm-4 9a.75.75 0 0 1 .75.75v1.25c0 .14.11.25.25.25h6a.25.25 0 0 0 .25-.25v-1.25a.75.75 0 0 1 1.5 0v1.25A1.75 1.75 0 0 1 11 14.5H5A1.75 1.75 0 0 1 3.25 12.75v-1.25A.75.75 0 0 1 4 10.5Z"
                                    />
                                  </svg>
                                </button>
                              )}
                              {viewModeEduEnroll === 'table' && (
                                <button
                                  type="button"
                                  className="pestel-chart-download-btn summary-download-icon-btn"
                                  onClick={downloadEduEnrollCsv}
                                  title="Export table data as CSV"
                                  aria-label="Export table data as CSV"
                                >
                                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                                    <path
                                      fill="currentColor"
                                      d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="metric-toggle-row-header"><div className="metric-toggle-title">Metrics displayed</div><div className="metric-toggle-hint">Tap to show or hide indicators</div></div>
                      <div className="metric-toggle-row">
                        {EDUCATION_ENROLLMENT_METRIC_IDS.map((mid) => (
                          <button key={mid} type="button" className={`tag ${selectedEduEnrollMetricIds.includes(mid) ? 'tag-active' : ''}`} onClick={() => setSelectedEduEnrollMetricIds(selectedEduEnrollMetricIds.includes(mid) ? selectedEduEnrollMetricIds.filter((m) => m !== mid) : [...selectedEduEnrollMetricIds, mid])}>
                            <span className="tag-swatch" style={{ backgroundColor: EDUCATION_ENROLLMENT_COLORS[mid] }} />
                            {GLOBAL_EDUCATION_ENROLLMENT_LEGEND_LABELS[mid] ?? eduEnrollData.labelByMetricId[mid] ?? mid}
                          </button>
                        ))}
                      </div>
                      <div id="global-education-enrollment-chart-wrapper">
                      {viewModeEduEnroll === 'chart' ? (
                        <div className="chart-wrapper">
                          <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={eduEnrollData.merged} margin={{ top: 12, right: 24, bottom: 24, left: 8 }}>
                              <CartesianGrid stroke="rgba(148,163,184,0.25)" vertical={false} />
                              <XAxis dataKey={eduEnrollData.xKey} ticks={eduEnrollData.xTicks} tickFormatter={eduEnrollData.formatAxisLabel} tickLine={false} tickMargin={8} stroke="rgba(148,163,184,0.9)" tick={{ fontSize: 10, fill: 'rgba(55,65,81,0.9)' }} />
                              <YAxis yAxisId="left" tickFormatter={(v) => formatCompactNumber(v as number)} tickLine={false} tickMargin={8} stroke="rgba(148,163,184,0.9)" />
                              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatPercentage(v as number)} tickLine={false} tickMargin={8} stroke="rgba(148,163,184,0.9)" />
                              <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(148,163,184,0.6)', borderRadius: 8, boxShadow: '0 10px 30px rgba(15,23,42,0.16)' }} content={<CustomTooltip mergedOverride={eduEnrollData.merged} xKeyOverride={eduEnrollData.xKey} labelByMetricIdOverride={eduEnrollData.labelByMetricId} selectedMetricIdsOverride={selectedEduEnrollMetricIds} frequencyOverride={frequencyEduEnroll} formatAxisLabelOverride={eduEnrollData.formatAxisLabel} metricIdsOverride={EDUCATION_ENROLLMENT_METRIC_IDS} freqLabelOverride={eduEnrollData.freqLabel} formatValueOverride={(id, val) => ['primaryEnrollmentPct', 'secondaryEnrollmentPct', 'tertiaryEnrollmentPct'].includes(id) ? (val != null ? formatPercentage(val) : '–') : (val != null ? formatCompactNumber(val) : '–')} />} />
                              {EDUCATION_ENROLLMENT_METRIC_IDS.map((metricId) => (
                                <Line key={metricId} type="monotone" dataKey={metricId} stroke={EDUCATION_ENROLLMENT_COLORS[metricId]} strokeWidth={2} dot={false} hide={!selectedEduEnrollMetricIds.includes(metricId) || !eduEnrollData.merged.some((row) => row[metricId] != null)} yAxisId={['primaryEnrollmentPct', 'secondaryEnrollmentPct', 'tertiaryEnrollmentPct'].includes(metricId) ? 'right' : 'left'} />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="chart-table-wrapper">
                          <div className="chart-table-scroll">
                            <table className="chart-table">
                              <thead>
                                <tr>
                                  <th>{frequencyEduEnroll === 'yearly' ? 'Year' : 'Period'}</th>
                                  {selectedEduEnrollMetricIds.map((id) => (<th key={id}>{eduEnrollData.labelByMetricId[id] ?? id}</th>))}
                                </tr>
                              </thead>
                              <tbody>
                                {eduEnrollData.merged.map((row, rowIndex) => (
                                  <tr key={String(row[eduEnrollData.xKey])}>
                                    <td>{eduEnrollData.formatAxisLabel(row[eduEnrollData.xKey] as string | number)}</td>
                                    {selectedEduEnrollMetricIds.map((id) => {
                                      const v = row[id];
                                      const prevRow = rowIndex > 0 ? eduEnrollData.merged[rowIndex - 1] : undefined;
                                      const prev = prevRow && prevRow[id] != null ? (prevRow[id] as number) : null;
                                      let changeText: string | null = null;
                                      let changeDir: 'up' | 'down' | 'flat' | null = null;
                                      if (v != null) {
                                        changeText = formatGrowthChange(v as number, prev ?? null, eduEnrollData.freqLabel[frequencyEduEnroll], id);
                                        if (changeText) {
                                          const diff = (v as number) - (prev ?? 0);
                                          if (isPercentageMetric(id)) { if (diff > 0.05) changeDir = 'up'; else if (diff < -0.05) changeDir = 'down'; else changeDir = 'flat'; }
                                          else if (prev != null && prev !== 0) { const pct = (diff / Math.abs(prev)) * 100; if (pct > 0.05) changeDir = 'up'; else if (pct < -0.05) changeDir = 'down'; else changeDir = 'flat'; }
                                        }
                                      }
                                      const isPct = ['primaryEnrollmentPct', 'secondaryEnrollmentPct', 'tertiaryEnrollmentPct'].includes(id);
                                      return (
                                        <td key={id}>
                                          {v == null ? '–' : (
                                            <div className="table-metric-cell">
                                              <div className="table-metric-value">{isPct ? formatPercentage(v as number) : formatCompactNumber(v as number)}</div>
                                              {changeText && changeDir && <div className={`table-metric-change table-metric-change-${changeDir}`}>{changeText}</div>}
                                            </div>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                  {isExpanded && id === 'labour' && (
                    <div className="card timeseries-section dashboard-grid-full">
                      <div className="section-header" style={{ marginTop: 0 }}>
                        <div>
                          <h2 className="section-title">{label}</h2>
                          <p className="muted">Global aggregates: weighted averages for rates/shares; world totals for levels.</p>
                        </div>
                        <div className="section-header-controls">
                          <div className="section-header-control-group">
                            <div className="section-control-label">Frequency</div>
                            <div className="frequency-toolbar" tabIndex={-1} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsFrequencyOpenLabour(false); }}>
                              <button type="button" className="map-metric-trigger" aria-haspopup="listbox" aria-expanded={isFrequencyOpenLabour} onClick={() => setIsFrequencyOpenLabour((o) => !o)}>
                                <span className="map-metric-trigger-icon"><svg viewBox="0 0 16 16"><path d="M5 1.5a.75.75 0 0 1 .75.75V3h4.5V2.25a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v8.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-8.5A1.75 1.75 0 0 1 3.75 3h.5V2.25A.75.75 0 0 1 5 1.5Z" /></svg></span>
                                <span className="map-metric-trigger-label">{FREQUENCY_LABELS[frequencyLabour]}</span>
                                <span className={`map-metric-trigger-chevron ${isFrequencyOpenLabour ? 'open' : ''}`} aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.53a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" /></svg></span>
                              </button>
                              {isFrequencyOpenLabour && (
                                <div className="map-metric-dropdown" role="listbox">
                                  <div className="map-metric-category">
                                    <div className="map-metric-category-header"><span className="map-metric-category-icon"><svg viewBox="0 0 16 16"><path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Z" /></svg></span><span>Sampling cadence</span></div>
                                    <div className="map-metric-category-items">
                                      {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                                        <button key={f} type="button" className={`map-metric-option ${frequencyLabour === f ? 'selected' : ''}`} onClick={() => { setFrequencyLabour(f); setIsFrequencyOpenLabour(false); }}>
                                          <span className="map-metric-option-icon">{frequencyLabour === f && <svg viewBox="0 0 16 16"><path d="M6.5 10.293 4.354 8.146a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5-5a.5.5 0 0 0-.708-.708L6.5 10.293Z" /></svg>}</span>
                                          <span>{FREQUENCY_LABELS[f]}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="section-header-control-group">
                            <div className="section-control-label">View</div>
                            <div className="pill-group pill-group-secondary">
                              <button type="button" className={`pill ${viewModeLabour === 'chart' ? 'pill-active' : ''}`} onClick={() => setViewModeLabour('chart')}><span className="icon-12"><svg viewBox="0 0 16 16"><path d="M2.75 3A.75.75 0 0 0 2 3.75v8.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75v-8.5A.75.75 0 0 0 14.25 3h-11.5Z" /></svg></span><span>Chart view</span></button>
                              <button type="button" className={`pill ${viewModeLabour === 'table' ? 'pill-active' : ''}`} onClick={() => setViewModeLabour('table')}><span className="icon-12"><svg viewBox="0 0 16 16"><path d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25Z" /></svg></span><span>Table view</span></button>
                            </div>
                          </div>
                          <div className="section-header-control-group">
                            <div className="section-control-label">Export</div>
                            <div className="pill-group pill-group-secondary">
                              {viewModeLabour === 'chart' && (
                                <button
                                  type="button"
                                  className="pestel-chart-download-btn summary-download-icon-btn"
                                  onClick={downloadLabourChartPng}
                                  title="Download chart view as high-resolution PNG"
                                  aria-label="Download chart view as high-resolution PNG"
                                >
                                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                                    <path
                                      fill="currentColor"
                                      d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L7.25 8.44V2.25A.75.75 0 0 1 8 1.5Zm-4 9a.75.75 0 0 1 .75.75v1.25c0 .14.11.25.25.25h6a.25.25 0 0 0 .25-.25v-1.25a.75.75 0 0 1 1.5 0v1.25A1.75 1.75 0 0 1 11 14.5H5A1.75 1.75 0 0 1 3.25 12.75v-1.25A.75.75 0 0 1 4 10.5Z"
                                    />
                                  </svg>
                                </button>
                              )}
                              {viewModeLabour === 'table' && (
                                <button
                                  type="button"
                                  className="pestel-chart-download-btn summary-download-icon-btn"
                                  onClick={downloadLabourCsv}
                                  title="Export table data as CSV"
                                  aria-label="Export table data as CSV"
                                >
                                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                                    <path
                                      fill="currentColor"
                                      d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="metric-toggle-row-header"><div className="metric-toggle-title">Metrics displayed</div><div className="metric-toggle-hint">Tap to show or hide indicators</div></div>
                      <div className="metric-toggle-row">
                        {LABOUR_METRIC_IDS.map((mid) => (
                          <button key={mid} type="button" className={`tag ${selectedLabourMetricIds.includes(mid) ? 'tag-active' : ''}`} onClick={() => setSelectedLabourMetricIds(selectedLabourMetricIds.includes(mid) ? selectedLabourMetricIds.filter((m) => m !== mid) : [...selectedLabourMetricIds, mid])}>
                            <span className="tag-swatch" style={{ backgroundColor: LABOUR_COLORS[mid] }} />
                            {GLOBAL_LABOUR_LEGEND_LABELS[mid] ?? labourData.labelByMetricId[mid] ?? mid}
                          </button>
                        ))}
                      </div>
                      <div id="global-labour-chart-wrapper">
                      {viewModeLabour === 'chart' ? (
                        <div className="chart-wrapper">
                          <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={labourData.merged} margin={{ top: 12, right: 24, bottom: 24, left: 8 }}>
                              <CartesianGrid stroke="rgba(148,163,184,0.25)" vertical={false} />
                              <XAxis dataKey={labourData.xKey} ticks={labourData.xTicks} tickFormatter={labourData.formatAxisLabel} tickLine={false} tickMargin={8} stroke="rgba(148,163,184,0.9)" tick={{ fontSize: 10, fill: 'rgba(55,65,81,0.9)' }} />
                              <YAxis yAxisId="left" tickFormatter={(v) => formatCompactNumber(v as number)} tickLine={false} tickMargin={8} stroke="rgba(148,163,184,0.9)" />
                              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatCompactNumber(v as number)} tickLine={false} tickMargin={8} stroke="rgba(148,163,184,0.9)" />
                              <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(148,163,184,0.6)', borderRadius: 8, boxShadow: '0 10px 30px rgba(15,23,42,0.16)' }} content={<CustomTooltip mergedOverride={labourData.merged} xKeyOverride={labourData.xKey} labelByMetricIdOverride={labourData.labelByMetricId} selectedMetricIdsOverride={selectedLabourMetricIds} frequencyOverride={frequencyLabour} formatAxisLabelOverride={labourData.formatAxisLabel} metricIdsOverride={LABOUR_METRIC_IDS} freqLabelOverride={labourData.freqLabel} />} />
                              {LABOUR_METRIC_IDS.map((metricId) => (
                                <Line key={metricId} type="monotone" dataKey={metricId} stroke={LABOUR_COLORS[metricId]} strokeWidth={2} dot={false} hide={!selectedLabourMetricIds.includes(metricId) || !labourData.merged.some((row) => row[metricId] != null)} yAxisId={metricId === 'labourForceTotal' ? 'right' : 'left'} />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="chart-table-wrapper">
                          <div className="chart-table-scroll">
                            <table className="chart-table">
                              <thead>
                                <tr>
                                  <th>{frequencyLabour === 'yearly' ? 'Year' : 'Period'}</th>
                                  {selectedLabourMetricIds.map((id) => (<th key={id}>{labourData.labelByMetricId[id] ?? id}</th>))}
                                </tr>
                              </thead>
                              <tbody>
                                {labourData.merged.map((row, rowIndex) => (
                                  <tr key={String(row[labourData.xKey])}>
                                    <td>{labourData.formatAxisLabel(row[labourData.xKey] as string | number)}</td>
                                    {selectedLabourMetricIds.map((id) => {
                                      const v = row[id];
                                      const prevRow = rowIndex > 0 ? labourData.merged[rowIndex - 1] : undefined;
                                      const prev = prevRow && prevRow[id] != null ? (prevRow[id] as number) : null;
                                      let changeText: string | null = null;
                                      let changeDir: 'up' | 'down' | 'flat' | null = null;
                                      if (v != null) {
                                        changeText = formatGrowthChange(v as number, prev ?? null, labourData.freqLabel[frequencyLabour], id);
                                        if (changeText) {
                                          const diff = (v as number) - (prev ?? 0);
                                          if (prev != null && prev !== 0) { const pct = (diff / Math.abs(prev)) * 100; if (pct > 0.05) changeDir = 'up'; else if (pct < -0.05) changeDir = 'down'; else changeDir = 'flat'; }
                                        }
                                      }
                                      return (
                                        <td key={id}>
                                          {v == null ? '–' : (
                                            <div className="table-metric-cell">
                                              <div className="table-metric-value">{formatCompactNumber(v as number)}</div>
                                              {changeText && changeDir && <div className={`table-metric-change table-metric-change-${changeDir}`}>{changeText}</div>}
                                            </div>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  )}

                  {isExpanded && id === 'educationInstitutions' && (
                    <div className="card timeseries-section dashboard-grid-full">
                      <div className="section-header" style={{ marginTop: 0 }}>
                        <div>
                          <h2 className="section-title">{label}</h2>
                          <p className="muted">
                            Global estimated counts of schools and universities, derived from UNESCO UIS / World Bank enrollment data using typical institution sizes. Intended for high-level system-size comparisons only.
                          </p>
                        </div>
                        <div className="section-header-controls">
                          <div className="section-header-control-group">
                            <div className="section-control-label">Frequency</div>
                            <div
                              className="frequency-toolbar"
                              tabIndex={-1}
                              onBlur={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                                  setIsFrequencyOpenEduInst(false);
                                }
                              }}
                            >
                              <button
                                type="button"
                                className="map-metric-trigger"
                                aria-haspopup="listbox"
                                aria-expanded={isFrequencyOpenEduInst}
                                onClick={() => setIsFrequencyOpenEduInst((o) => !o)}
                              >
                                <span className="map-metric-trigger-icon">
                                  <svg viewBox="0 0 16 16">
                                    <path d="M5 1.5a.75.75 0 0 1 .75.75V3h4.5V2.25a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v8.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-8.5A1.75 1.75 0 0 1 3.75 3h.5V2.25A.75.75 0 0 1 5 1.5Z" />
                                  </svg>
                                </span>
                                <span className="map-metric-trigger-label">
                                  {FREQUENCY_LABELS[frequencyEduInst]}
                                </span>
                                <span
                                  className={`map-metric-trigger-chevron ${
                                    isFrequencyOpenEduInst ? 'open' : ''
                                  }`}
                                  aria-hidden="true"
                                >
                                  <svg viewBox="0 0 16 16">
                                    <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.53a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
                                  </svg>
                                </span>
                              </button>
                              {isFrequencyOpenEduInst && (
                                <div className="map-metric-dropdown" role="listbox">
                                  <div className="map-metric-category">
                                    <div className="map-metric-category-header">
                                      <span className="map-metric-category-icon">
                                        <svg viewBox="0 0 16 16">
                                          <path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Z" />
                                        </svg>
                                      </span>
                                      <span>Sampling cadence</span>
                                    </div>
                                    <div className="map-metric-category-items">
                                      {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                                        <button
                                          key={f}
                                          type="button"
                                          className={`map-metric-option ${
                                            frequencyEduInst === f ? 'selected' : ''
                                          }`}
                                          onClick={() => {
                                            setFrequencyEduInst(f);
                                            setIsFrequencyOpenEduInst(false);
                                          }}
                                        >
                                          <span className="map-metric-option-icon">
                                            {frequencyEduInst === f && (
                                              <svg viewBox="0 0 16 16">
                                                <path d="M6.5 10.293 4.354 8.146a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5-5a.5.5 0 0 0-.708-.708L6.5 10.293Z" />
                                              </svg>
                                            )}
                                          </span>
                                          <span>{FREQUENCY_LABELS[f]}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="section-header-control-group">
                            <div className="section-control-label">View</div>
                            <div className="pill-group pill-group-secondary">
                              <button
                                type="button"
                                className={`pill ${
                                  viewModeEduInst === 'chart' ? 'pill-active' : ''
                                }`}
                                onClick={() => setViewModeEduInst('chart')}
                              >
                                <span className="icon-12">
                                  <svg viewBox="0 0 16 16">
                                    <path d="M2.75 3A.75.75 0 0 0 2 3.75v8.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75v-8.5A.75.75 0 0 0 14.25 3h-11.5Z" />
                                  </svg>
                                </span>
                                <span>Chart view</span>
                              </button>
                              <button
                                type="button"
                                className={`pill ${
                                  viewModeEduInst === 'table' ? 'pill-active' : ''
                                }`}
                                onClick={() => setViewModeEduInst('table')}
                              >
                                <span className="icon-12">
                                  <svg viewBox="0 0 16 16">
                                    <path d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25Z" />
                                  </svg>
                                </span>
                                <span>Table view</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="section-header-control-group">
                        <div className="section-control-label">Export</div>
                        <div className="pill-group pill-group-secondary">
                          {viewModeEduInst === 'chart' && (
                            <button
                              type="button"
                              className="pestel-chart-download-btn summary-download-icon-btn"
                              onClick={downloadEduInstChartPng}
                              title="Download chart view as high-resolution PNG"
                              aria-label="Download chart view as high-resolution PNG"
                            >
                              <svg
                                viewBox="0 0 16 16"
                                width="16"
                                height="16"
                                aria-hidden="true"
                                focusable="false"
                              >
                                <path
                                  fill="currentColor"
                                  d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L7.25 8.44V2.25A.75.75 0 0 1 8 1.5Zm-4 9a.75.75 0 0 1 .75.75v1.25c0 .14.11.25.25.25h6a.25.25 0 0 0 .25-.25v-1.25a.75.75 0 0 1 1.5 0v1.25A1.75 1.75 0 0 1 11 14.5H5A1.75 1.75 0 0 1 3.25 12.75v-1.25A.75.75 0 0 1 4 10.5Z"
                                />
                              </svg>
                            </button>
                          )}
                          {viewModeEduInst === 'table' && (
                            <button
                              type="button"
                              className="pestel-chart-download-btn summary-download-icon-btn"
                              onClick={downloadEduInstCsv}
                              title="Export table data as CSV"
                              aria-label="Export table data as CSV"
                            >
                              <svg
                                viewBox="0 0 16 16"
                                width="16"
                                height="16"
                                aria-hidden="true"
                                focusable="false"
                              >
                                <path
                                  fill="currentColor"
                                  d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="metric-toggle-row-header">
                        <div className="metric-toggle-title">Metrics displayed</div>
                        <div className="metric-toggle-hint">
                          Tap to show or hide indicators
                        </div>
                      </div>
                      <div className="metric-toggle-row">
                        {EDUCATION_INSTITUTION_METRIC_IDS.map((id) => (
                          <button
                            key={id}
                            type="button"
                            className={`tag ${
                              selectedEduInstMetricIds.includes(id) ? 'tag-active' : ''
                            }`}
                            onClick={() => {
                              if (selectedEduInstMetricIds.includes(id)) {
                                setSelectedEduInstMetricIds(
                                  selectedEduInstMetricIds.filter((m) => m !== id),
                                );
                              } else {
                                setSelectedEduInstMetricIds([
                                  ...selectedEduInstMetricIds,
                                  id,
                                ]);
                              }
                            }}
                          >
                            <span
                              className="tag-swatch"
                              style={{ backgroundColor: EDUCATION_INSTITUTION_COLORS[id] }}
                            />
                            {GLOBAL_EDUCATION_INSTITUTION_LEGEND_LABELS[id] ?? id}
                          </button>
                        ))}
                      </div>

                      <div id="global-education-institutions-chart-wrapper">
                      {viewModeEduInst === 'chart' ? (
                        <div className="chart-wrapper">
                          <ResponsiveContainer width="100%" height={320}>
                            <LineChart
                              data={eduInstData.merged}
                              margin={{ top: 12, right: 24, bottom: 24, left: 8 }}
                            >
                              <CartesianGrid
                                stroke="rgba(148,163,184,0.25)"
                                vertical={false}
                              />
                              <XAxis
                                dataKey={eduInstData.xKey}
                                ticks={eduInstData.xTicks}
                                tickFormatter={eduInstData.formatAxisLabel}
                                tickLine={false}
                                tickMargin={8}
                                stroke="rgba(148,163,184,0.9)"
                                tick={{
                                  fontSize: 10,
                                  fill: 'rgba(55,65,81,0.9)',
                                }}
                              />
                              <YAxis
                                tickFormatter={(v) => formatCompactNumber(v as number)}
                                tickLine={false}
                                tickMargin={8}
                                stroke="rgba(148,163,184,0.9)"
                              />
                              <Tooltip
                                contentStyle={{
                                  background: '#ffffff',
                                  border: '1px solid rgba(148,163,184,0.6)',
                                  borderRadius: 8,
                                  boxShadow: '0 10px 30px rgba(15,23,42,0.16)',
                                }}
                                content={
                                  <CustomTooltip
                                    mergedOverride={eduInstData.merged}
                                    xKeyOverride={eduInstData.xKey}
                                    labelByMetricIdOverride={eduInstData.labelByMetricId}
                                    selectedMetricIdsOverride={selectedEduInstMetricIds}
                                    frequencyOverride={frequencyEduInst}
                                    formatAxisLabelOverride={eduInstData.formatAxisLabel}
                                    metricIdsOverride={EDUCATION_INSTITUTION_METRIC_IDS}
                                    freqLabelOverride={eduInstData.freqLabel}
                                    formatValueOverride={(_, val) =>
                                      val != null ? formatCompactNumber(val) : '–'
                                    }
                                  />
                                }
                              />
                              {EDUCATION_INSTITUTION_METRIC_IDS.map((metricId) => (
                                <Line
                                  key={metricId}
                                  type="monotone"
                                  dataKey={metricId}
                                  stroke={EDUCATION_INSTITUTION_COLORS[metricId]}
                                  strokeWidth={2}
                                  dot={false}
                                  hide={
                                    !selectedEduInstMetricIds.includes(metricId) ||
                                    !eduInstData.merged.some((row) => row[metricId] != null)
                                  }
                                  yAxisId="left"
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="chart-table-wrapper">
                          <div className="chart-table-scroll">
                            <table className="chart-table">
                              <thead>
                                <tr>
                                  <th>Year</th>
                                  {selectedEduInstMetricIds.map((id) => (
                                    <th key={id}>
                                      {GLOBAL_EDUCATION_INSTITUTION_LABELS[id] ?? id}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {eduInstData.merged.map((row, rowIndex) => (
                                    <tr key={row[eduInstData.xKey] as string | number}>
                                      <td>
                                        {eduInstData.formatAxisLabel(
                                          row[eduInstData.xKey] as string | number,
                                        )}
                                      </td>
                                      {selectedEduInstMetricIds.map((id) => {
                                        const v = row[id] as number | null;
                                        const prevRow =
                                          rowIndex > 0
                                            ? (eduInstData.merged[rowIndex - 1] as any)
                                            : undefined;
                                        const prev =
                                          prevRow && prevRow[id] != null
                                            ? (prevRow[id] as number)
                                            : null;

                                        let changeText: string | null = null;
                                        let changeDir: 'up' | 'down' | 'flat' | null = null;
                                        if (v != null) {
                                          changeText = formatGrowthChange(
                                            v,
                                            prev ?? null,
                                            eduInstData.freqLabel[frequencyEduInst],
                                            id,
                                          );
                                          if (changeText) {
                                            const diff = v - (prev ?? 0);
                                            if (prev != null && prev !== 0) {
                                              const pct = (diff / Math.abs(prev)) * 100;
                                              if (pct > 0.05) changeDir = 'up';
                                              else if (pct < -0.05) changeDir = 'down';
                                              else changeDir = 'flat';
                                            } else {
                                              changeDir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
                                            }
                                          }
                                        }

                                        return (
                                          <td key={id}>
                                            {v == null ? (
                                              '–'
                                            ) : (
                                              <div className="table-metric-cell">
                                                <div className="table-metric-value">
                                                  {formatCompactNumber(v)}
                                                </div>
                                                {changeText && changeDir && (
                                                  <div
                                                    className={`table-metric-change table-metric-change-${changeDir}`}
                                                  >
                                                    {changeText}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
