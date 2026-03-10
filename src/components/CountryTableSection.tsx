import React, { useEffect, useState } from 'react';
import type { CountryDashboardData, GlobalCountryMetricsRow } from '../types';
import { formatCompactNumber, formatPercentage } from '../utils/numberFormat';
import { sanitizeFilenameSegment } from '../utils/filename';
import { formatGrowthChangeShort } from '../utils/growthFormat';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';
import { computeGlobalValue, toGlobalAggregateOption } from '../utils/globalAggregates';
import {
  METRIC_METADATA,
  EDUCATION_SUBCATEGORY_LABELS,
  EDUCATION_SUBCATEGORY_ORDER,
} from '../data/metricMetadata';
import type { MetricMetadata } from '../data/metricMetadata';

/** Row key in GlobalCountryMetricsRow -> metadata id when they differ (e.g. pop shares). */
const ROW_KEY_TO_METADATA_ID: Partial<Record<keyof GlobalCountryMetricsRow, string>> = {
  pop0_14Pct: 'pop0_14Share',
  pop15_64Pct: 'pop15_64Share',
  pop65PlusPct: 'pop65PlusShare',
};

type CategoryKey = 'geography' | 'financial' | 'population' | 'health' | 'education';
type FormatKind = 'compact' | 'percentage' | 'area' | 'gpi';

/** Ordered comparison rows: category and optional education subcategory. */
const COMPARISON_ORDER: Array<{
  rowKey: keyof GlobalCountryMetricsRow;
  category: CategoryKey;
  educationSubcategory?: NonNullable<MetricMetadata['educationSubcategory']>;
}> = [
  { rowKey: 'landAreaKm2', category: 'geography' },
  { rowKey: 'totalAreaKm2', category: 'geography' },
  { rowKey: 'eezKm2', category: 'geography' },
  { rowKey: 'gdpNominal', category: 'financial' },
  { rowKey: 'gdpPPP', category: 'financial' },
  { rowKey: 'gdpNominalPerCapita', category: 'financial' },
  { rowKey: 'gdpPPPPerCapita', category: 'financial' },
  { rowKey: 'inflationCPI', category: 'financial' },
  { rowKey: 'unemploymentRate', category: 'financial' },
  { rowKey: 'unemployedTotal', category: 'financial' },
  { rowKey: 'labourForceTotal', category: 'financial' },
  { rowKey: 'interestRate', category: 'financial' },
  { rowKey: 'povertyHeadcount215', category: 'financial' },
  { rowKey: 'povertyHeadcountNational', category: 'financial' },
  { rowKey: 'govDebtPercentGDP', category: 'financial' },
  { rowKey: 'govDebtUSD', category: 'financial' },
  { rowKey: 'populationTotal', category: 'population' },
  { rowKey: 'pop0_14Pct', category: 'population' },
  { rowKey: 'pop15_64Pct', category: 'population' },
  { rowKey: 'pop65PlusPct', category: 'population' },
  { rowKey: 'lifeExpectancy', category: 'health' },
  { rowKey: 'maternalMortalityRatio', category: 'health' },
  { rowKey: 'under5MortalityRate', category: 'health' },
  { rowKey: 'undernourishmentPrevalence', category: 'health' },
  { rowKey: 'outOfSchoolPrimaryPct', category: 'education', educationSubcategory: 'primary' },
  { rowKey: 'primaryCompletionRate', category: 'education', educationSubcategory: 'primary' },
  { rowKey: 'minProficiencyReadingPct', category: 'education', educationSubcategory: 'primary' },
  { rowKey: 'primaryPupilsTotal', category: 'education', educationSubcategory: 'primary' },
  { rowKey: 'primaryEnrollmentPct', category: 'education', educationSubcategory: 'primary' },
  { rowKey: 'primarySchoolsTotal', category: 'education', educationSubcategory: 'primary' },
  { rowKey: 'outOfSchoolSecondaryPct', category: 'education', educationSubcategory: 'secondary' },
  { rowKey: 'secondaryCompletionRate', category: 'education', educationSubcategory: 'secondary' },
  { rowKey: 'secondaryPupilsTotal', category: 'education', educationSubcategory: 'secondary' },
  { rowKey: 'secondaryEnrollmentPct', category: 'education', educationSubcategory: 'secondary' },
  { rowKey: 'secondarySchoolsTotal', category: 'education', educationSubcategory: 'secondary' },
  { rowKey: 'outOfSchoolTertiaryPct', category: 'education', educationSubcategory: 'tertiary' },
  { rowKey: 'tertiaryCompletionRate', category: 'education', educationSubcategory: 'tertiary' },
  { rowKey: 'tertiaryEnrollmentPct', category: 'education', educationSubcategory: 'tertiary' },
  { rowKey: 'tertiaryEnrollmentTotal', category: 'education', educationSubcategory: 'tertiary' },
  { rowKey: 'tertiaryInstitutionsTotal', category: 'education', educationSubcategory: 'tertiary' },
  { rowKey: 'literacyRateAdultPct', category: 'education', educationSubcategory: 'literacy_attainment' },
  { rowKey: 'genderParityIndexPrimary', category: 'education', educationSubcategory: 'equity_quality_investment' },
  { rowKey: 'genderParityIndexSecondary', category: 'education', educationSubcategory: 'equity_quality_investment' },
  { rowKey: 'genderParityIndexTertiary', category: 'education', educationSubcategory: 'equity_quality_investment' },
  { rowKey: 'trainedTeachersPrimaryPct', category: 'education', educationSubcategory: 'equity_quality_investment' },
  { rowKey: 'trainedTeachersSecondaryPct', category: 'education', educationSubcategory: 'equity_quality_investment' },
  { rowKey: 'trainedTeachersTertiaryPct', category: 'education', educationSubcategory: 'equity_quality_investment' },
  { rowKey: 'publicExpenditureEducationPctGDP', category: 'education', educationSubcategory: 'equity_quality_investment' },
];

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  geography: 'Geography',
  financial: 'Financial',
  population: 'Population',
  health: 'Health',
  education: 'Education',
};

function getLabel(rowKey: keyof GlobalCountryMetricsRow): string {
  const id = ROW_KEY_TO_METADATA_ID[rowKey] ?? rowKey;
  return METRIC_METADATA.find((m) => m.id === id)?.label ?? String(rowKey);
}

function getFormat(meta: MetricMetadata | undefined): FormatKind {
  if (!meta) return 'compact';
  const u = meta.unit.toLowerCase();
  if (u.includes('%') || u.includes('percentage')) return 'percentage';
  if (u.includes('km²') || u === 'km²') return 'area';
  if (u === 'ratio') return 'gpi';
  return 'compact';
}

interface Props {
  data?: CountryDashboardData;
  /** Increment to force refetch of global comparison data (e.g. after "Refresh all data"). */
  refreshTrigger?: number;
}

export function CountryTableSection({ data, refreshTrigger = 0 }: Props) {
  if (!data?.latestSnapshot) {
    return (
      <section className="card table-section">
        <h2 className="section-title">Country financial table</h2>
        <p className="muted">
          Loading latest GDP and per-capita metrics for the selected country...
        </p>
      </section>
    );
  }

  const { latestSnapshot: snapshot } = data;

  const [globalRowsCurr, setGlobalRowsCurr] = useState<
    GlobalCountryMetricsRow[]
  >([]);
  const [globalRowsPrev, setGlobalRowsPrev] = useState<
    GlobalCountryMetricsRow[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(undefined);
      try {
        const [curr, prev] = await Promise.all([
          fetchGlobalCountryMetricsForYear(snapshot.year),
          fetchGlobalCountryMetricsForYear(snapshot.year - 1),
        ]);
        if (!cancelled) {
          setGlobalRowsCurr(curr);
          setGlobalRowsPrev(prev);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Failed to load country comparison table.',
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
  }, [snapshot.year, refreshTrigger]);

  function downloadCsv() {
    const rowsForCsv = COMPARISON_ORDER;
    const lines: string[] = [];

    function csvEscape(value: unknown): string {
      const s = String(value ?? '');
      if (s === '') return '';
      return `"${s.replace(/"/g, '""')}"`;
    }

    type ColumnDef = {
      header: string;
      value: (row: (typeof COMPARISON_ORDER)[number]) => unknown;
    };

    const columns: ColumnDef[] = [
      {
        header: 'Group',
        value: (row) => CATEGORY_LABELS[row.category],
      },
      {
        header: 'Education subcategory',
        value: (row) =>
          row.educationSubcategory != null
            ? EDUCATION_SUBCATEGORY_LABELS[row.educationSubcategory]
            : '',
      },
      { header: 'Metric', value: (row) => getLabel(row.rowKey) },
      {
        header: `${snapshot.country.name}`,
        value: (row) => aggsByKey[row.rowKey]?.selected ?? '',
      },
      {
        header: 'Avg country',
        value: (row) => aggsByKey[row.rowKey]?.avgCountry ?? '',
      },
      {
        header: 'Global',
        value: (row) => aggsByKey[row.rowKey]?.global ?? '',
      },
      {
        header: `${snapshot.country.name} YoY`,
        value: (row) => aggsByKey[row.rowKey]?.yoySelected ?? '',
      },
      {
        header: 'Avg country YoY',
        value: (row) => aggsByKey[row.rowKey]?.yoyAvg ?? '',
      },
      {
        header: 'Global YoY',
        value: (row) => aggsByKey[row.rowKey]?.yoyGlobal ?? '',
      },
    ];

    if (!rowsForCsv.length) return;

    lines.push(columns.map((c) => csvEscape(c.header)).join(','));
    for (const row of rowsForCsv) {
      const values = columns.map((c) => csvEscape(c.value(row)));
      lines.push(values.join(','));
    }

    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const countryLabel = sanitizeFilenameSegment(snapshot.country.name ?? 'country');
    link.href = url;
    link.download = `country-comparison-${countryLabel}-${snapshot.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const latestNonNullUpToYear = (
    points: Array<{ year: number; value: number | null | undefined }> | undefined,
    year: number,
  ): number | null => {
    if (!points || !points.length) return null;
    const candidates = points
      .filter((p) => p.year <= year && p.value != null)
      .sort((a, b) => a.year - b.year);
    if (!candidates.length) return null;
    const last = candidates[candidates.length - 1];
    return last.value != null ? last.value : null;
  };

  const computeAggregates = (
    key: keyof GlobalCountryMetricsRow,
    seriesId: string,
    options?: {
      globalAsAverage?: boolean;
      selectedOverride?: number | null;
      /** Global = sum(numerator)/sum(denominator). Use for ratio-of-totals (e.g. GDP per capita, unemployment %, gov debt %). */
      globalFromRatio?: {
        numeratorKey: keyof GlobalCountryMetricsRow;
        denominatorKey: keyof GlobalCountryMetricsRow;
        /** Optional multiplier for display (e.g. 100 for percentages). */
        scale?: number;
      };
      /** Global = sum(value * weight) / sum(weight). Use for rates that should be weighted (e.g. inflation GDP-weighted, age share pop-weighted). */
      globalFromWeightedAverage?: {
        weightKey: keyof GlobalCountryMetricsRow;
      };
    },
  ) => {
    const valuesCurr = globalRowsCurr
      .map((r) => r[key])
      .filter((v): v is number => v != null && !Number.isNaN(v));
    if (!valuesCurr.length) {
      return {
        selected: (options?.selectedOverride !== undefined ? options.selectedOverride : null) as number | null,
        avgCountry: null as number | null,
        global: null as number | null,
        yoySelected: null as string | null,
        yoyAvg: null as string | null,
        yoyGlobal: null as string | null,
      };
    }
    const sumCurr = valuesCurr.reduce((acc, v) => acc + v, 0);
    const avgCurr = sumCurr / valuesCurr.length;

    const valuesPrev = globalRowsPrev
      .map((r) => r[key])
      .filter((v): v is number => v != null && !Number.isNaN(v));

    let globalValue: number | null = null;
    let ratioCurr: number | null = null;
    let ratioPrev: number | null = null;
    const globalOption = toGlobalAggregateOption(options);
    if (globalOption) {
      ratioCurr = computeGlobalValue(globalRowsCurr, key, globalOption);
      ratioPrev = computeGlobalValue(globalRowsPrev, key, globalOption);
      globalValue = ratioCurr;
    }

    let yoySelected: string | null = null;
    let yoyAvg: string | null = null;
    let yoyGlobal: string | null = null;
    const series = (() => {
      if (seriesId === 'populationTotal') return (data.series?.population ?? [])[0];
      const health = (data.series?.health ?? []).find((s) => s.id === seriesId);
      if (health) return health;
      const education = (data.series?.education ?? []).find((s) => s.id === seriesId);
      if (education) return education;
      return (data.series?.financial ?? []).find((s) => s.id === seriesId);
    })();
    if (series && options?.selectedOverride === undefined) {
      const points = series.points ?? [];
      const curr = points.find((p) => p.year === snapshot.year)?.value;
      const prev = points.find((p) => p.year === snapshot.year - 1)
        ?.value;
      if (curr != null) {
        yoySelected = formatGrowthChangeShort(curr, prev ?? null, seriesId);
      }
    }

    if (valuesPrev.length) {
      const sumPrev = valuesPrev.reduce((acc, v) => acc + v, 0);
      const avgPrev = sumPrev / valuesPrev.length;

      yoyAvg = formatGrowthChangeShort(avgCurr, avgPrev, key as string);

      const useAverageForGlobal = options?.globalAsAverage === true;
      if (useAverageForGlobal) {
        yoyGlobal = formatGrowthChangeShort(avgCurr, avgPrev, key as string);
      } else {
        yoyGlobal = formatGrowthChangeShort(sumCurr, sumPrev, key as string);
      }
    }
    if (ratioCurr != null && ratioPrev != null) {
      yoyGlobal = formatGrowthChangeShort(ratioCurr, ratioPrev, key as string);
    }

    const useAverageForGlobal = options?.globalAsAverage === true;
    if (globalValue == null && !options?.globalFromRatio && !options?.globalFromWeightedAverage) {
      globalValue = useAverageForGlobal ? avgCurr : sumCurr;
    }

    const selected =
      options?.selectedOverride !== undefined
        ? options.selectedOverride
        : series
          ? latestNonNullUpToYear(series.points, snapshot.year)
          : null;

    const useRatioOrWeightedForAvg =
      options?.globalFromRatio != null || options?.globalFromWeightedAverage != null;
    const avgCountryValue =
      useRatioOrWeightedForAvg && globalValue != null
        ? globalValue
        : avgCurr;
    const avgCountryYoy =
      useRatioOrWeightedForAvg && yoyGlobal != null ? yoyGlobal : yoyAvg;

    return {
      selected,
      avgCountry: avgCountryValue,
      global: globalValue,
      yoySelected,
      yoyAvg: avgCountryYoy,
      yoyGlobal,
    };
  };

  const gdpNominalAgg = computeAggregates(
    'gdpNominal',
    'gdpNominal',
  );
  const gdpPPPAgg = computeAggregates(
    'gdpPPP',
    'gdpPPP',
  );
  const gdpNominalPerCapitaAgg = computeAggregates(
    'gdpNominalPerCapita',
    'gdpNominalPerCapita',
    {
      globalFromRatio: {
        numeratorKey: 'gdpNominal',
        denominatorKey: 'populationTotal',
      },
    },
  );
  const gdpPPPPerCapitaAgg = computeAggregates(
    'gdpPPPPerCapita',
    'gdpPPPPerCapita',
    {
      globalFromRatio: {
        numeratorKey: 'gdpPPP',
        denominatorKey: 'populationTotal',
      },
    },
  );
  const inflationCPIAgg = computeAggregates(
    'inflationCPI',
    'inflationCPI',
    { globalFromWeightedAverage: { weightKey: 'gdpNominal' } },
  );
  const govDebtPercentGDPAgg = computeAggregates(
    'govDebtPercentGDP',
    'govDebtPercentGDP',
    {
      globalFromRatio: {
        numeratorKey: 'govDebtUSD',
        denominatorKey: 'gdpNominal',
        scale: 100,
      },
    },
  );
  const govDebtUSDAgg = computeAggregates(
    'govDebtUSD',
    'govDebtUSD',
  );
  const interestRateAgg = computeAggregates(
    'interestRate',
    'interestRate',
    { globalFromWeightedAverage: { weightKey: 'gdpNominal' } },
  );
  const unemploymentRateAgg = computeAggregates(
    'unemploymentRate',
    'unemploymentRate',
    {
      globalFromRatio: {
        numeratorKey: 'unemployedTotal',
        denominatorKey: 'labourForceTotal',
        scale: 100,
      },
    },
  );
  const unemployedTotalAgg = computeAggregates(
    'unemployedTotal',
    'unemployedTotal',
  );
  const labourForceTotalAgg = computeAggregates(
    'labourForceTotal',
    'labourForceTotal',
  );
  const populationAgg = computeAggregates(
    'populationTotal',
    'populationTotal',
  );

  const geography = snapshot.metrics.geography;
  const landAreaAgg = computeAggregates('landAreaKm2', 'landArea', {
    selectedOverride: geography?.landAreaKm2 ?? null,
  });
  const totalAreaAgg = computeAggregates('totalAreaKm2', 'surfaceArea', {
    selectedOverride: geography?.totalAreaKm2 ?? null,
  });
  const eezAgg = computeAggregates('eezKm2', 'eez', {
    selectedOverride: geography?.eezKm2 ?? null,
  });

  const poverty215Agg = computeAggregates(
    'povertyHeadcount215',
    'povertyHeadcount215',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const povertyNationalAgg = computeAggregates(
    'povertyHeadcountNational',
    'povertyHeadcountNational',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );

  const lifeExpectancyAgg = computeAggregates(
    'lifeExpectancy',
    'lifeExpectancy',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const maternalMortalityAgg = computeAggregates(
    'maternalMortalityRatio',
    'maternalMortalityRatio',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const under5MortalityAgg = computeAggregates(
    'under5MortalityRate',
    'under5MortalityRate',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const undernourishmentAgg = computeAggregates(
    'undernourishmentPrevalence',
    'undernourishmentPrevalence',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const pop0_14Agg = computeAggregates('pop0_14Pct', 'pop0_14Share', {
    globalFromWeightedAverage: { weightKey: 'populationTotal' },
  });
  const pop15_64Agg = computeAggregates('pop15_64Pct', 'pop15_64Share', {
    globalFromWeightedAverage: { weightKey: 'populationTotal' },
  });
  const pop65PlusAgg = computeAggregates('pop65PlusPct', 'pop65PlusShare', {
    globalFromWeightedAverage: { weightKey: 'populationTotal' },
  });

  const outOfSchoolPrimaryPctAgg = computeAggregates(
    'outOfSchoolPrimaryPct',
    'outOfSchoolPrimaryPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const outOfSchoolSecondaryPctAgg = computeAggregates(
    'outOfSchoolSecondaryPct',
    'outOfSchoolSecondaryPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const outOfSchoolTertiaryPctAgg = computeAggregates(
    'outOfSchoolTertiaryPct',
    'outOfSchoolTertiaryPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const primaryCompletionRateAgg = computeAggregates(
    'primaryCompletionRate',
    'primaryCompletionRate',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const secondaryCompletionRateAgg = computeAggregates(
    'secondaryCompletionRate',
    'secondaryCompletionRate',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const tertiaryCompletionRateAgg = computeAggregates(
    'tertiaryCompletionRate',
    'tertiaryCompletionRate',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const minProficiencyReadingPctAgg = computeAggregates(
    'minProficiencyReadingPct',
    'minProficiencyReadingPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const literacyRateAdultPctAgg = computeAggregates(
    'literacyRateAdultPct',
    'literacyRateAdultPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const genderParityIndexPrimaryAgg = computeAggregates(
    'genderParityIndexPrimary',
    'genderParityIndexPrimary',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const genderParityIndexSecondaryAgg = computeAggregates(
    'genderParityIndexSecondary',
    'genderParityIndexSecondary',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const genderParityIndexTertiaryAgg = computeAggregates(
    'genderParityIndexTertiary',
    'genderParityIndexTertiary',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const trainedTeachersPrimaryPctAgg = computeAggregates(
    'trainedTeachersPrimaryPct',
    'trainedTeachersPrimaryPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const trainedTeachersSecondaryPctAgg = computeAggregates(
    'trainedTeachersSecondaryPct',
    'trainedTeachersSecondaryPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const trainedTeachersTertiaryPctAgg = computeAggregates(
    'trainedTeachersTertiaryPct',
    'trainedTeachersTertiaryPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const publicExpenditureEducationPctGDPAgg = computeAggregates(
    'publicExpenditureEducationPctGDP',
    'publicExpenditureEducationPctGDP',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const primaryEnrollmentPctAgg = computeAggregates(
    'primaryEnrollmentPct',
    'primaryEnrollmentPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const secondaryEnrollmentPctAgg = computeAggregates(
    'secondaryEnrollmentPct',
    'secondaryEnrollmentPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const tertiaryEnrollmentPctAgg = computeAggregates(
    'tertiaryEnrollmentPct',
    'tertiaryEnrollmentPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const primaryPupilsTotalAgg = computeAggregates(
    'primaryPupilsTotal',
    'primaryPupilsTotal',
  );
  const secondaryPupilsTotalAgg = computeAggregates(
    'secondaryPupilsTotal',
    'secondaryPupilsTotal',
  );
  const tertiaryEnrollmentTotalAgg = computeAggregates(
    'tertiaryEnrollmentTotal',
    'tertiaryEnrollmentTotal',
  );
  const primarySchoolsTotalAgg = computeAggregates(
    'primarySchoolsTotal',
    'primarySchoolsTotal',
  );
  const secondarySchoolsTotalAgg = computeAggregates(
    'secondarySchoolsTotal',
    'secondarySchoolsTotal',
  );
  const tertiaryInstitutionsTotalAgg = computeAggregates(
    'tertiaryInstitutionsTotal',
    'tertiaryInstitutionsTotal',
  );

  const [expandedGroups, setExpandedGroups] = useState({
    geography: true,
    financial: true,
    population: true,
    health: true,
    education: true,
  });

  const toggleGroup = (group: CategoryKey) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  type Agg = ReturnType<typeof computeAggregates>;
  const aggsByKey: Record<string, Agg> = {
    gdpNominal: gdpNominalAgg,
    gdpPPP: gdpPPPAgg,
    gdpNominalPerCapita: gdpNominalPerCapitaAgg,
    gdpPPPPerCapita: gdpPPPPerCapitaAgg,
    inflationCPI: inflationCPIAgg,
    govDebtPercentGDP: govDebtPercentGDPAgg,
    govDebtUSD: govDebtUSDAgg,
    interestRate: interestRateAgg,
    unemploymentRate: unemploymentRateAgg,
    unemployedTotal: unemployedTotalAgg,
    labourForceTotal: labourForceTotalAgg,
    povertyHeadcount215: poverty215Agg,
    povertyHeadcountNational: povertyNationalAgg,
    populationTotal: populationAgg,
    pop0_14Pct: pop0_14Agg,
    pop15_64Pct: pop15_64Agg,
    pop65PlusPct: pop65PlusAgg,
    lifeExpectancy: lifeExpectancyAgg,
    maternalMortalityRatio: maternalMortalityAgg,
    under5MortalityRate: under5MortalityAgg,
    undernourishmentPrevalence: undernourishmentAgg,
    landAreaKm2: landAreaAgg,
    totalAreaKm2: totalAreaAgg,
    eezKm2: eezAgg,
    outOfSchoolPrimaryPct: outOfSchoolPrimaryPctAgg,
    outOfSchoolSecondaryPct: outOfSchoolSecondaryPctAgg,
    outOfSchoolTertiaryPct: outOfSchoolTertiaryPctAgg,
    primaryCompletionRate: primaryCompletionRateAgg,
    secondaryCompletionRate: secondaryCompletionRateAgg,
    tertiaryCompletionRate: tertiaryCompletionRateAgg,
    minProficiencyReadingPct: minProficiencyReadingPctAgg,
    literacyRateAdultPct: literacyRateAdultPctAgg,
    genderParityIndexPrimary: genderParityIndexPrimaryAgg,
    genderParityIndexSecondary: genderParityIndexSecondaryAgg,
    genderParityIndexTertiary: genderParityIndexTertiaryAgg,
    trainedTeachersPrimaryPct: trainedTeachersPrimaryPctAgg,
    trainedTeachersSecondaryPct: trainedTeachersSecondaryPctAgg,
    trainedTeachersTertiaryPct: trainedTeachersTertiaryPctAgg,
    publicExpenditureEducationPctGDP: publicExpenditureEducationPctGDPAgg,
    primaryEnrollmentPct: primaryEnrollmentPctAgg,
    secondaryEnrollmentPct: secondaryEnrollmentPctAgg,
    tertiaryEnrollmentPct: tertiaryEnrollmentPctAgg,
    primaryPupilsTotal: primaryPupilsTotalAgg,
    secondaryPupilsTotal: secondaryPupilsTotalAgg,
    tertiaryEnrollmentTotal: tertiaryEnrollmentTotalAgg,
    primarySchoolsTotal: primarySchoolsTotalAgg,
    secondarySchoolsTotal: secondarySchoolsTotalAgg,
    tertiaryInstitutionsTotal: tertiaryInstitutionsTotalAgg,
  };

  const renderRow = (
    label: string,
    agg: Agg,
    format: 'compact' | 'percentage' | 'area' | 'gpi',
  ) => {
    const fmt = (v: number | null) => {
      if (v == null) return '–';
      if (format === 'percentage') return formatPercentage(v);
      if (format === 'area') return `${formatCompactNumber(v)} km²`;
      if (format === 'gpi') return v >= 10 ? (v / 100).toFixed(2) : v.toFixed(2);
      return formatCompactNumber(v);
    };
    const yoyClass = agg.yoySelected?.startsWith('-') ? ' table-cell-yoy--negative' : '';
    return (
      <tr key={label}>
        <td>{label}</td>
        <td className="numeric-cell">
          <div className="table-cell-main">{fmt(agg.selected)}</div>
          {agg.yoySelected && (
            <div className={`table-cell-yoy${yoyClass}`}>{agg.yoySelected}</div>
          )}
        </td>
        <td className="numeric-cell">
          <div className="table-cell-main">{fmt(agg.avgCountry)}</div>
          {agg.yoyAvg && <div className="table-cell-yoy">{agg.yoyAvg}</div>}
        </td>
        <td className="numeric-cell">
          <div className="table-cell-main">{fmt(agg.global)}</div>
          {agg.yoyGlobal && (
            <div className="table-cell-yoy">{agg.yoyGlobal}</div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <section className="card table-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            Country comparison (year {snapshot.year})
          </h2>
          <p className="muted small">
            Selected country versus world average (ratio- or weighted where applicable) and global totals.
          </p>
        </div>
        <div className="section-header-control-group">
          <div className="section-control-label">Export</div>
          <div className="pill-group pill-group-secondary">
            <button
              type="button"
              className="pestel-chart-download-btn summary-download-icon-btn"
              onClick={downloadCsv}
              title="Export country comparison as CSV"
              aria-label="Export country comparison as CSV"
              disabled={loading || !!error}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="table-wrapper">
        {loading && !globalRowsCurr.length ? (
          <p className="muted small">Loading latest country comparison data…</p>
        ) : (
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>{snapshot.country.name}</th>
              <th>Avg country</th>
              <th>Global</th>
            </tr>
          </thead>
          <tbody>
            {(['geography', 'financial', 'population', 'health', 'education'] as CategoryKey[]).map((category) => {
              const rows = COMPARISON_ORDER.filter((r) => r.category === category);
              if (!rows.length) return null;
              const expanded = expandedGroups[category];
              return (
                <React.Fragment key={category}>
                  <tr
                    className="table-group-header table-group-header-clickable"
                    onClick={() => toggleGroup(category)}
                  >
                    <td colSpan={4}>
                      <span className="table-group-header-inner">
                        <span className="table-group-chevron">
                          {expanded ? '▾' : '▸'}
                        </span>
                        <span>{CATEGORY_LABELS[category]}</span>
                      </span>
                    </td>
                  </tr>
                  {expanded &&
                    (category !== 'education'
                      ? rows.map(({ rowKey }) => {
                          const agg = aggsByKey[rowKey];
                          const meta = METRIC_METADATA.find(
                            (m) => m.id === (ROW_KEY_TO_METADATA_ID[rowKey] ?? rowKey),
                          );
                          if (!agg) return null;
                          return (
                            <React.Fragment key={rowKey}>
                              {renderRow(getLabel(rowKey), agg, getFormat(meta))}
                            </React.Fragment>
                          );
                        })
                      : (() => {
                          const bySub = new Map<NonNullable<MetricMetadata['educationSubcategory']>, typeof rows>();
                          for (const r of rows) {
                            const sub = r.educationSubcategory ?? ('primary' as const);
                            if (!bySub.has(sub)) bySub.set(sub, []);
                            bySub.get(sub)!.push(r);
                          }
                          return EDUCATION_SUBCATEGORY_ORDER.filter((sub) => bySub.has(sub)).map((sub) => (
                            <React.Fragment key={sub}>
                              <tr className="table-subgroup-header">
                                <td colSpan={4}>
                                  <span className="table-subgroup-header-inner">
                                    {EDUCATION_SUBCATEGORY_LABELS[sub]}
                                  </span>
                                </td>
                              </tr>
                              {bySub.get(sub)!.map(({ rowKey }) => {
                                const agg = aggsByKey[rowKey];
                                const meta = METRIC_METADATA.find(
                                  (m) => m.id === (ROW_KEY_TO_METADATA_ID[rowKey] ?? rowKey),
                                );
                                if (!agg) return null;
                                return (
                                  <React.Fragment key={rowKey}>
                                    {renderRow(getLabel(rowKey), agg, getFormat(meta))}
                                  </React.Fragment>
                                );
                              })}
                            </React.Fragment>
                          ));
                        })())}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        )}
      </div>
      <p className="muted small">
        Figures are illustrative aggregates using available country data. For precise methodology,
        refer to the source documentation.
      </p>
    </section>
  );
}

