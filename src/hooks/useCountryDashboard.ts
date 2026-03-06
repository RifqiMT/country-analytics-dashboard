import { useEffect, useState } from 'react';
import type { CountryDashboardData, Frequency } from '../types';
import { fetchCountryDashboardData } from '../api/worldBank';
import { resampleSeries } from '../utils/timeSeries';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';
import { useToast } from '../components/ToastProvider';

interface UseCountryDashboardOptions {
  initialCountryCode?: string;
  initialFrequency?: Frequency;
  /** Increment to force refetch of country dashboard data (e.g. after "Refresh all data"). */
  refreshTrigger?: number;
}

interface UseCountryDashboardResult {
  countryCode: string;
  setCountryCode: (code: string) => void;
  frequency: Frequency;
  setFrequency: (f: Frequency) => void;
  macroFrequency: Frequency;
  setMacroFrequency: (f: Frequency) => void;
  macroHealthFrequency: Frequency;
  setMacroHealthFrequency: (f: Frequency) => void;
  labourFrequency: Frequency;
  setLabourFrequency: (f: Frequency) => void;
  populationStructureFrequency: Frequency;
  setPopulationStructureFrequency: (f: Frequency) => void;
  startYear: number;
  endYear: number;
  setStartYear: (year: number) => void;
  setEndYear: (year: number) => void;
  data?: CountryDashboardData;
  loading: boolean;
  error?: string;
  resampled: CountryDashboardData['series'] | undefined;
  resampledMacro: CountryDashboardData['series'] | undefined;
  resampledMacroHealth: CountryDashboardData['series'] | undefined;
  resampledLabour: CountryDashboardData['series'] | undefined;
  resampledPopulationStructure: CountryDashboardData['series'] | undefined;
}

const DEFAULT_COUNTRY = 'ID'; // Indonesia as default
const DEFAULT_START_YEAR = DATA_MIN_YEAR;
const DEFAULT_END_YEAR = DATA_MAX_YEAR;

export function useCountryDashboard(
  options?: UseCountryDashboardOptions,
): UseCountryDashboardResult {
  const { showToast, dismissToast } = useToast();
  const refreshTrigger = options?.refreshTrigger ?? 0;
  const [countryCode, setCountryCode] = useState(
    options?.initialCountryCode ?? DEFAULT_COUNTRY,
  );
  const [frequency, setFrequency] = useState<Frequency>(
    options?.initialFrequency ?? 'yearly',
  );
  const [macroFrequency, setMacroFrequency] = useState<Frequency>(
    options?.initialFrequency ?? 'yearly',
  );
  const [macroHealthFrequency, setMacroHealthFrequency] = useState<Frequency>(
    options?.initialFrequency ?? 'yearly',
  );
  const [labourFrequency, setLabourFrequency] = useState<Frequency>(
    options?.initialFrequency ?? 'yearly',
  );
  const [populationStructureFrequency, setPopulationStructureFrequency] =
    useState<Frequency>(options?.initialFrequency ?? 'yearly');
  const [startYear, setStartYear] = useState<number>(DEFAULT_START_YEAR);
  const [endYear, setEndYear] = useState<number>(DEFAULT_END_YEAR);
  const [data, setData] = useState<CountryDashboardData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const code = countryCode?.trim();
    if (!code) {
      setData(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(undefined);
      const loadingId = showToast({
        type: 'loading',
        message: 'Refreshing country dashboard…',
      });
      try {
        const result = await fetchCountryDashboardData(
          code,
          startYear,
          endYear,
        );
        if (!cancelled) {
          setData(result);
          showToast({
            type: 'success',
            message: 'Country dashboard updated.',
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Failed to load country analytics data.',
          );
          showToast({
            type: 'error',
            message: 'Failed to load country dashboard.',
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
        dismissToast(loadingId);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [countryCode, startYear, endYear, refreshTrigger, dismissToast, showToast]);

  const resampled = data?.series
    ? {
        financial: (data.series.financial ?? []).map((s) =>
          resampleSeries(s, frequency),
        ),
        population: (data.series.population ?? []).map((s) =>
          resampleSeries(s, frequency),
        ),
        health: (data.series.health ?? []).map((s) =>
          resampleSeries(s, frequency),
        ),
      }
    : undefined;

  const resampledMacro = data?.series
    ? {
        financial: (data.series.financial ?? []).map((s) =>
          resampleSeries(s, macroFrequency),
        ),
        population: (data.series.population ?? []).map((s) =>
          resampleSeries(s, macroFrequency),
        ),
        health: (data.series.health ?? []).map((s) =>
          resampleSeries(s, macroFrequency),
        ),
      }
    : undefined;

  const resampledMacroHealth = data?.series
    ? {
        financial: (data.series.financial ?? []).map((s) =>
          resampleSeries(s, macroHealthFrequency),
        ),
        population: (data.series.population ?? []).map((s) =>
          resampleSeries(s, macroHealthFrequency),
        ),
        health: (data.series.health ?? []).map((s) =>
          resampleSeries(s, macroHealthFrequency),
        ),
      }
    : undefined;

  const resampledLabour = data?.series
    ? {
        financial: (data.series.financial ?? []).map((s) =>
          resampleSeries(s, labourFrequency),
        ),
        population: (data.series.population ?? []).map((s) =>
          resampleSeries(s, labourFrequency),
        ),
        health: (data.series.health ?? []).map((s) =>
          resampleSeries(s, labourFrequency),
        ),
      }
    : undefined;

  const resampledPopulationStructure = data?.series
    ? {
        financial: (data.series.financial ?? []).map((s) =>
          resampleSeries(s, populationStructureFrequency),
        ),
        population: (data.series.population ?? []).map((s) =>
          resampleSeries(s, populationStructureFrequency),
        ),
        health: (data.series.health ?? []).map((s) =>
          resampleSeries(s, populationStructureFrequency),
        ),
      }
    : undefined;

  return {
    countryCode,
    setCountryCode,
    frequency,
    setFrequency,
    macroFrequency,
    setMacroFrequency,
    macroHealthFrequency,
    setMacroHealthFrequency,
    labourFrequency,
    setLabourFrequency,
    populationStructureFrequency,
    setPopulationStructureFrequency,
    startYear,
    endYear,
    setStartYear,
    setEndYear,
    data,
    loading,
    error,
    resampled,
    resampledMacro,
    resampledMacroHealth,
    resampledLabour,
    resampledPopulationStructure,
  };
}

