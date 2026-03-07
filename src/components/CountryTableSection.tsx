import { useEffect, useState } from 'react';
import type { CountryDashboardData, GlobalCountryMetricsRow } from '../types';
import { formatCompactNumber, formatPercentage } from '../utils/numberFormat';
import { formatGrowthChangeShort } from '../utils/growthFormat';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';
import { computeGlobalValue, toGlobalAggregateOption } from '../utils/globalAggregates';

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
  const [, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [curr, prev] = await Promise.all([
          fetchGlobalCountryMetricsForYear(snapshot.year),
          fetchGlobalCountryMetricsForYear(snapshot.year - 1),
        ]);
        if (!cancelled) {
          setGlobalRowsCurr(curr);
          setGlobalRowsPrev(prev);
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
  const primaryCompletionRateAgg = computeAggregates(
    'primaryCompletionRate',
    'primaryCompletionRate',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const minProficiencyReadingPctAgg = computeAggregates(
    'minProficiencyReadingPct',
    'minProficiencyReadingPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const preprimaryEnrollmentPctAgg = computeAggregates(
    'preprimaryEnrollmentPct',
    'preprimaryEnrollmentPct',
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
  const trainedTeachersPrimaryPctAgg = computeAggregates(
    'trainedTeachersPrimaryPct',
    'trainedTeachersPrimaryPct',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );
  const publicExpenditureEducationPctGDPAgg = computeAggregates(
    'publicExpenditureEducationPctGDP',
    'publicExpenditureEducationPctGDP',
    { globalFromWeightedAverage: { weightKey: 'populationTotal' } },
  );

  const [expandedGroups, setExpandedGroups] = useState({
    general: true,
    financial: true,
    health: true,
    education: true,
  });

  const toggleGroup = (group: 'general' | 'financial' | 'health' | 'education') => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  type Agg = ReturnType<typeof computeAggregates>;
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
      </div>
      <div className="table-wrapper">
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
            <tr
              className="table-group-header table-group-header-clickable"
              onClick={() => toggleGroup('general')}
            >
              <td colSpan={4}>
                <span className="table-group-header-inner">
                  <span className="table-group-chevron">
                    {expandedGroups.general ? '▾' : '▸'}
                  </span>
                  <span>General</span>
                </span>
              </td>
            </tr>
            {expandedGroups.general && (
              <>
                {renderRow('Total population', populationAgg, 'compact')}
                {renderRow('Land area (km²)', landAreaAgg, 'area')}
                {renderRow('Total area (km²)', totalAreaAgg, 'area')}
                {renderRow('EEZ (km²)', eezAgg, 'area')}
              </>
            )}

            <tr
              className="table-group-header table-group-header-clickable"
              onClick={() => toggleGroup('financial')}
            >
              <td colSpan={4}>
                <span className="table-group-header-inner">
                  <span className="table-group-chevron">
                    {expandedGroups.financial ? '▾' : '▸'}
                  </span>
                  <span>Financial metrics</span>
                </span>
              </td>
            </tr>
            {expandedGroups.financial && (
              <>
                {renderRow('GDP (Nominal, US$)', gdpNominalAgg, 'compact')}
                {renderRow('GDP (PPP, Intl$)', gdpPPPAgg, 'compact')}
                {renderRow('GDP per capita (Nominal, US$)', gdpNominalPerCapitaAgg, 'compact')}
                {renderRow('GDP per capita (PPP, Intl$)', gdpPPPPerCapitaAgg, 'compact')}
                {renderRow('Government debt (USD)', govDebtUSDAgg, 'compact')}
                {renderRow('Inflation (CPI, %)', inflationCPIAgg, 'percentage')}
                {renderRow('Government debt (% of GDP)', govDebtPercentGDPAgg, 'percentage')}
                {renderRow('Lending interest rate (%)', interestRateAgg, 'percentage')}
                {renderRow('Unemployment rate (% of labour force)', unemploymentRateAgg, 'percentage')}
                {renderRow('Unemployed (number of people)', unemployedTotalAgg, 'compact')}
                {renderRow('Labour force (total)', labourForceTotalAgg, 'compact')}
                {renderRow('Poverty headcount ($2.15/day, %)', poverty215Agg, 'percentage')}
                {renderRow('Poverty headcount (national line, %)', povertyNationalAgg, 'percentage')}
              </>
            )}

            <tr
              className="table-group-header table-group-header-clickable"
              onClick={() => toggleGroup('health')}
            >
              <td colSpan={4}>
                <span className="table-group-header-inner">
                  <span className="table-group-chevron">
                    {expandedGroups.health ? '▾' : '▸'}
                  </span>
                  <span>Health &amp; demographics</span>
                </span>
              </td>
            </tr>
            {expandedGroups.health && (
              <>
                {renderRow('Life expectancy at birth (years)', lifeExpectancyAgg, 'compact')}
                {renderRow('Maternal mortality ratio (per 100,000 live births)', maternalMortalityAgg, 'compact')}
                {renderRow('Under-5 mortality rate (per 1,000 live births)', under5MortalityAgg, 'compact')}
                {renderRow('Prevalence of undernourishment (% of population)', undernourishmentAgg, 'percentage')}
                {renderRow('Population 0–14 (% of total)', pop0_14Agg, 'percentage')}
                {renderRow('Population 15–64 (% of total)', pop15_64Agg, 'percentage')}
                {renderRow('Population 65+ (% of total)', pop65PlusAgg, 'percentage')}
              </>
            )}

            <tr
              className="table-group-header table-group-header-clickable"
              onClick={() => toggleGroup('education')}
            >
              <td colSpan={4}>
                <span className="table-group-header-inner">
                  <span className="table-group-chevron">
                    {expandedGroups.education ? '▾' : '▸'}
                  </span>
                  <span>Education</span>
                </span>
              </td>
            </tr>
            {expandedGroups.education && (
              <>
                {renderRow('Out-of-school rate (primary, % of primary school age)', outOfSchoolPrimaryPctAgg, 'percentage')}
                {renderRow('Primary completion rate (% of relevant age group)', primaryCompletionRateAgg, 'percentage')}
                {renderRow('Minimum reading proficiency (% at end of primary)', minProficiencyReadingPctAgg, 'percentage')}
                {renderRow('Preprimary enrollment (% gross)', preprimaryEnrollmentPctAgg, 'percentage')}
                {renderRow('Adult literacy rate (% ages 15+)', literacyRateAdultPctAgg, 'percentage')}
                {renderRow('Gender parity index (GPI), primary enrollment', genderParityIndexPrimaryAgg, 'gpi')}
                {renderRow('Trained teachers in primary (% of total teachers)', trainedTeachersPrimaryPctAgg, 'percentage')}
                {renderRow('Public expenditure on education (% of GDP)', publicExpenditureEducationPctGDPAgg, 'percentage')}
              </>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Figures are illustrative aggregates using available country data. For precise methodology,
        refer to the source documentation.
      </p>
    </section>
  );
}

