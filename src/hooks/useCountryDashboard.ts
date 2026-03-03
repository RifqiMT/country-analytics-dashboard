import { useEffect, useState } from 'react';
import type { CountryDashboardData, Frequency, MetricId } from '../types';
import { fetchCountryDashboardData } from '../api/worldBank';
import { resampleSeries } from '../utils/timeSeries';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';

interface UseCountryDashboardOptions {
  initialCountryCode?: string;
  initialFrequency?: Frequency;
}

interface UseCountryDashboardResult {
  countryCode: string;
  setCountryCode: (code: string) => void;
  frequency: Frequency;
  setFrequency: (f: Frequency) => void;
  startYear: number;
  endYear: number;
  setStartYear: (year: number) => void;
  setEndYear: (year: number) => void;
  selectedMetricIds: MetricId[];
  setSelectedMetricIds: (ids: MetricId[]) => void;
  data?: CountryDashboardData;
  loading: boolean;
  error?: string;
  resampled: CountryDashboardData['series'] | undefined;
}

const DEFAULT_COUNTRY = 'ID'; // Indonesia as default
const DEFAULT_START_YEAR = DATA_MIN_YEAR;
const DEFAULT_END_YEAR = DATA_MAX_YEAR;

export function useCountryDashboard(
  options?: UseCountryDashboardOptions,
): UseCountryDashboardResult {
  const [countryCode, setCountryCode] = useState(
    options?.initialCountryCode ?? DEFAULT_COUNTRY,
  );
  const [frequency, setFrequency] = useState<Frequency>(
    options?.initialFrequency ?? 'yearly',
  );
  const [startYear, setStartYear] = useState<number>(DEFAULT_START_YEAR);
  const [endYear, setEndYear] = useState<number>(DEFAULT_END_YEAR);
  const [selectedMetricIds, setSelectedMetricIds] = useState<MetricId[]>([
    'gdpNominal',
    'populationTotal',
  ]);
  const [data, setData] = useState<CountryDashboardData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(undefined);
      try {
        const result = await fetchCountryDashboardData(
          countryCode,
          startYear,
          endYear,
        );
        if (!cancelled) {
          setData(result);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Failed to load country analytics data.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [countryCode, startYear, endYear]);

  const resampled = data
    ? {
        financial: data.series.financial.map((s) =>
          resampleSeries(s, frequency),
        ),
        population: data.series.population.map((s) =>
          resampleSeries(s, frequency),
        ),
        health: data.series.health.map((s) => resampleSeries(s, frequency)),
      }
    : undefined;

  return {
    countryCode,
    setCountryCode,
    frequency,
    setFrequency,
    startYear,
    endYear,
    setStartYear,
    setEndYear,
    selectedMetricIds,
    setSelectedMetricIds,
    data,
    loading,
    error,
    resampled,
  };
}

