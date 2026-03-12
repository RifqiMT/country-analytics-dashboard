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
  educationOOSFrequency: Frequency;
  setEducationOOSFrequency: (f: Frequency) => void;
  educationEnrollmentStaffFrequency: Frequency;
  setEducationEnrollmentStaffFrequency: (f: Frequency) => void;
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
  resampledEducationOOS: CountryDashboardData['series'] | undefined;
  resampledEducationEnrollmentStaff: CountryDashboardData['series'] | undefined;
  resampledLabour: CountryDashboardData['series'] | undefined;
  resampledPopulationStructure: CountryDashboardData['series'] | undefined;
}

const DEFAULT_COUNTRY = 'ID'; // Indonesia as default
const DEFAULT_START_YEAR = DATA_MIN_YEAR;
const DEFAULT_END_YEAR = DATA_MAX_YEAR;

export function useCountryDashboard(
  options?: UseCountryDashboardOptions,
): UseCountryDashboardResult {
  const { showToast, updateToast, dismissToast } = useToast();
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
  const [educationOOSFrequency, setEducationOOSFrequency] = useState<Frequency>(
    options?.initialFrequency ?? 'yearly',
  );
  const [educationEnrollmentStaffFrequency, setEducationEnrollmentStaffFrequency] =
    useState<Frequency>(options?.initialFrequency ?? 'yearly');
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
      // Clear previous snapshot immediately so the UI doesn't momentarily
      // show the old country's data while a new country is loading.
      setData(undefined);
      setLoading(true);
      setError(undefined);
      const start = performance.now();
      const loadingId = showToast({
        type: 'loading',
        message: 'Refreshing country dashboard… (0%)',
      });
      try {
        let result: CountryDashboardData;
        // In the browser, go through the cached /api/country-dashboard endpoint
        // so the server can reuse results instead of hitting World Bank every time.
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams({
            countryCode: code,
            startYear: String(startYear),
            endYear: String(endYear),
            // Include refreshTrigger in the query so that pressing
            // "Refresh all data" forces a cache miss on the server-side
            // /api/country-dashboard cache. The server folds this into
            // its cache key, ensuring new upstream data is fetched.
            refreshToken: String(refreshTrigger),
          });
          const res = await fetch(`/api/country-dashboard?${params.toString()}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(
              text || `Country dashboard API responded with status ${res.status}`,
            );
          }
          result = (await res.json()) as CountryDashboardData;
        } else {
          result = await fetchCountryDashboardData(
            code,
            startYear,
            endYear,
          );
        }
        if (cancelled) return;
        setData(result);
        const seconds = Math.max((performance.now() - start) / 1000, 0.1).toFixed(1);
        updateToast(loadingId, {
          type: 'success',
          message: `Country dashboard updated (100%, ${seconds}s).`,
          durationMs: 4000,
        });
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? e.message
            : 'Failed to load country analytics data.',
        );
        const seconds = Math.max((performance.now() - start) / 1000, 0.1).toFixed(1);
        updateToast(loadingId, {
          type: 'error',
          message: `Failed to load country dashboard (0%, ${seconds}s).`,
          durationMs: 6000,
        });
      } finally {
        if (cancelled) {
          // Effect was torn down (country/year/refresh changed); drop this toast.
          dismissToast(loadingId);
          return;
        }
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [countryCode, startYear, endYear, refreshTrigger, showToast, updateToast, dismissToast]);

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
        education: (data.series.education ?? []).map((s) =>
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
        education: (data.series.education ?? []).map((s) =>
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
        education: (data.series.education ?? []).map((s) =>
          resampleSeries(s, macroHealthFrequency),
        ),
      }
    : undefined;

  const resampledEducationOOS = data?.series
    ? {
        financial: (data.series.financial ?? []).map((s) =>
          resampleSeries(s, educationOOSFrequency),
        ),
        population: (data.series.population ?? []).map((s) =>
          resampleSeries(s, educationOOSFrequency),
        ),
        health: (data.series.health ?? []).map((s) =>
          resampleSeries(s, educationOOSFrequency),
        ),
        education: (data.series.education ?? []).map((s) =>
          resampleSeries(s, educationOOSFrequency),
        ),
      }
    : undefined;

  const resampledEducationEnrollmentStaff = data?.series
    ? {
        financial: (data.series.financial ?? []).map((s) =>
          resampleSeries(s, educationEnrollmentStaffFrequency),
        ),
        population: (data.series.population ?? []).map((s) =>
          resampleSeries(s, educationEnrollmentStaffFrequency),
        ),
        health: (data.series.health ?? []).map((s) =>
          resampleSeries(s, educationEnrollmentStaffFrequency),
        ),
        education: (data.series.education ?? []).map((s) =>
          resampleSeries(s, educationEnrollmentStaffFrequency),
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
        education: (data.series.education ?? []).map((s) =>
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
        education: (data.series.education ?? []).map((s) =>
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
    educationOOSFrequency,
    setEducationOOSFrequency,
    educationEnrollmentStaffFrequency,
    setEducationEnrollmentStaffFrequency,
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
    resampledEducationOOS,
    resampledEducationEnrollmentStaff,
    resampledLabour,
    resampledPopulationStructure,
  };
}

