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
import type { Frequency, MetricId, MetricSeries, TimePoint } from '../types';
import { formatCompactNumber, formatPercentage } from '../utils/numberFormat';
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
} from '../utils/globalAggregates';

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

interface Props {
  /** Increment to force refetch (e.g. after "Refresh all data"). */
  refreshTrigger?: number;
  /** Selected max year from the Global Analytics year filter. */
  maxYear: number;
}

export function GlobalChartsSection({ refreshTrigger = 0, maxYear }: Props) {
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
  const [viewModePop, setViewModePop] = useState<'chart' | 'table'>('chart');
  const [isFrequencyOpenPop, setIsFrequencyOpenPop] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const years = Array.from(
      { length: DATA_MAX_YEAR - DATA_MIN_YEAR + 1 },
      (_, i) => DATA_MIN_YEAR + i,
    );
    Promise.all(years.map((y) => fetchGlobalCountryMetricsForYear(y)))
      .then((rowsPerYear) => {
        if (cancelled) return;

        const seriesList: MetricSeries[] = ECONOMIC_METRIC_IDS.map((id) => {
          const config = GLOBAL_ECONOMIC_AGGREGATES[id];
          const points: TimePoint[] = rowsPerYear.map((rows, i) => {
            const year = years[i];
            const value = config
              ? computeGlobalValue(rows, config.valueKey, config.option)
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
              ? computeGlobalValue(rows, config.valueKey, config.option)
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
              ? computeGlobalValue(rows, config.valueKey, config.option)
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
              ? computeGlobalValue(rows, config.valueKey, config.option)
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
          const total = rows.reduce(
            (s, r) => s + (r.populationTotal != null && !Number.isNaN(r.populationTotal) ? r.populationTotal : 0),
            0,
          );
          if (total > 0) popByYear[year] = total;
        });
        setWorldPopByYear(popByYear);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load global metrics.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const allSeries = globalSeries;
  const resampledSeries = allSeries.map((s) => resampleSeries(s, frequency));

  const displayStartYear = DATA_MIN_YEAR;
  const displayEndYear = Math.min(
    Math.max(maxYear, DATA_MIN_YEAR),
    DATA_MAX_YEAR,
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
      if (prev != null && prev !== 0) {
        const pct = ((current - prev) / Math.abs(prev)) * 100;
        const rounded = Number.isFinite(pct) ? pct : 0;
        if (rounded > 0.05) changeDirection = 'up';
        else if (rounded < -0.05) changeDirection = 'down';
        else changeDirection = 'flat';
        change = `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}% ${freqLbl[freq]}`;
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
      <section className="card timeseries-section">
        <h2 className="section-title">Global Charts</h2>
        <p className="muted">Loading global macro indicators…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card timeseries-section">
        <h2 className="section-title">Global Charts</h2>
        <p className="muted">{error}</p>
      </section>
    );
  }

  return (
    <section className="card timeseries-section dashboard-grid-full">
      {/* 1. Unified financial & population timeline */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            Global Charts – Unified financial &amp; population timeline
          </h2>
          <p className="muted">
            World totals: sum of GDP (nominal &amp; PPP), government debt (USD), and population; GDP per capita = world GDP ÷ world population. Same metrics as the country-level unified timeline. Population on right axis.
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
            {labelByMetricIdUnified[id] ?? id}
          </button>
        ))}
      </div>

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
                      if (prev != null && prev !== 0 && v != null) {
                        const pct = (((v as number) - prev) / Math.abs(prev)) * 100;
                        const rounded = Number.isFinite(pct) ? pct : 0;
                        if (rounded > 0.05) changeDir = 'up';
                        else if (rounded < -0.05) changeDir = 'down';
                        else changeDir = 'flat';
                        changeText = `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}% ${freqLabelUnified[frequencyUnified]}`;
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

      {/* 2. Macro indicators (economic & financial) */}
      <div className="section-header" style={{ marginTop: '2rem' }}>
        <div>
          <h2 className="section-title">
            Global Charts – Macro indicators (economic &amp; financial)
          </h2>
          <p className="muted">
            World aggregates: average across all countries with data. Same metrics as the country-level
            macro timeline (inflation, government debt, lending rate, unemployment, poverty). Switch between
            weekly, monthly, quarterly, and annual views; sub-annual views are interpolated from annual data.
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
            {labelByMetricId[id] ?? id}
          </button>
        ))}
      </div>

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
                      if (prev != null && prev !== 0 && v != null) {
                        const pct = (((v as number) - prev) / Math.abs(prev)) * 100;
                        const rounded = Number.isFinite(pct) ? pct : 0;
                        if (rounded > 0.05) changeDir = 'up';
                        else if (rounded < -0.05) changeDir = 'down';
                        else changeDir = 'flat';
                        changeText = `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}% ${
                          freqLabel[frequency]
                        }`;
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

      {/* 3. Macro indicators (health) */}
      <div className="section-header" style={{ marginTop: '2rem' }}>
        <div>
          <h2 className="section-title">
            Global Charts – Macro indicators (health)
          </h2>
          <p className="muted">
            World-level population-weighted averages for health and demographics (maternal mortality, under-5 mortality,
            undernourishment, life expectancy). Same formula as the Country Comparison table on the Country Dashboard—values match for the same year.
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
            {GLOBAL_HEALTH_LABELS[id] ?? id}
          </button>
        ))}
      </div>

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
                      if (prev != null && prev !== 0 && v != null) {
                        const pct = (((v as number) - prev) / Math.abs(prev)) * 100;
                        const rounded = Number.isFinite(pct) ? pct : 0;
                        if (rounded > 0.05) changeDir = 'up';
                        else if (rounded < -0.05) changeDir = 'down';
                        else changeDir = 'flat';
                        changeText = `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}% ${
                          freqLabelHealth[frequencyHealth]
                        }`;
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

      {/* 4. Population structure */}
      <div className="section-header" style={{ marginTop: '2rem' }}>
        <div>
          <h2 className="section-title">
            Global Charts – Population structure
          </h2>
          <p className="muted">
            World-level population by age group (0–14, 15–64, 65+) as share of total. Population-weighted average.
            Absolute numbers show world total in each age group (share × world population). Same logic as the economic and health blocks above.
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
            {GLOBAL_POP_STRUCTURE_LABELS[id] ?? id}
          </button>
        ))}
      </div>

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
                      if (prev != null && prev !== 0 && v != null) {
                        const pct = (((v as number) - prev) / Math.abs(prev)) * 100;
                        const rounded = Number.isFinite(pct) ? pct : 0;
                        if (rounded > 0.05) changeDir = 'up';
                        else if (rounded < -0.05) changeDir = 'down';
                        else changeDir = 'flat';
                        changeText = `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}% ${freqLabelPop[frequencyPop]}`;
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
    </section>
  );
}
