import { useEffect, useState } from 'react';
import type { CountryDashboardData, GlobalCountryMetricsRow } from '../types';
import { formatCompactNumber, formatPercentage } from '../utils/numberFormat';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';

interface Props {
  data?: CountryDashboardData;
}

export function CountryTableSection({ data }: Props) {
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
  const { metrics } = snapshot;

  const [globalRowsCurr, setGlobalRowsCurr] = useState<
    GlobalCountryMetricsRow[]
  >([]);
  const [globalRowsPrev, setGlobalRowsPrev] = useState<
    GlobalCountryMetricsRow[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [showAgeBreakdown, setShowAgeBreakdown] = useState(true);

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
  }, [snapshot.year]);

  const computeAggregates = (
    key: keyof GlobalCountryMetricsRow,
    seriesId: string,
  ) => {
    const valuesCurr = globalRowsCurr
      .map((r) => r[key])
      .filter((v): v is number => v != null && !Number.isNaN(v));
    if (!valuesCurr.length) {
      return {
        selected: null as number | null,
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

    let yoySelected: string | null = null;
    let yoyAvg: string | null = null;
    let yoyGlobal: string | null = null;
    const series = (() => {
      if (seriesId === 'populationTotal') return data.series.population[0];
      const health = data.series.health.find((s) => s.id === seriesId);
      if (health) return health;
      return data.series.financial.find((s) => s.id === seriesId);
    })();
    if (series) {
      const curr = series.points.find((p) => p.year === snapshot.year)?.value;
      const prev = series.points.find((p) => p.year === snapshot.year - 1)
        ?.value;
      if (curr != null && prev != null && prev !== 0) {
        const pct = ((curr - prev) / Math.abs(prev)) * 100;
        if (Number.isFinite(pct)) {
          const sign = pct > 0 ? '+' : '';
          yoySelected = `${sign}${pct.toFixed(1)}%`;
        }
      }
    }

    if (valuesPrev.length) {
      const sumPrev = valuesPrev.reduce((acc, v) => acc + v, 0);
      const avgPrev = sumPrev / valuesPrev.length;

      if (avgPrev !== 0) {
        const pct = ((avgCurr - avgPrev) / Math.abs(avgPrev)) * 100;
        if (Number.isFinite(pct)) {
          const sign = pct > 0 ? '+' : '';
          yoyAvg = `${sign}${pct.toFixed(1)}%`;
        }
      }

      if (sumPrev !== 0) {
        const pct = ((sumCurr - sumPrev) / Math.abs(sumPrev)) * 100;
        if (Number.isFinite(pct)) {
          const sign = pct > 0 ? '+' : '';
          yoyGlobal = `${sign}${pct.toFixed(1)}%`;
        }
      }
    }

    return {
      selected: series
        ? series.points.find((p) => p.year === snapshot.year)?.value ?? null
        : null,
      avgCountry: avgCurr,
      global: sumCurr,
      yoySelected,
      yoyAvg,
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
  );
  const gdpPPPPerCapitaAgg = computeAggregates(
    'gdpPPPPerCapita',
    'gdpPPPPerCapita',
  );
  const populationAgg = computeAggregates(
    'populationTotal',
    'populationTotal',
  );

  const pop0_14Agg = computeAggregates(
    'population0_14',
    'pop0_14Share',
  );
  const pop15_64Agg = computeAggregates(
    'population15_64',
    'pop15_64Share',
  );
  const pop65PlusAgg = computeAggregates(
    'population65Plus',
    'pop65PlusShare',
  );

  const ageGroups = snapshot.metrics.population.ageBreakdown?.groups ?? [];

  return (
    <section className="card table-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            Country comparison (year {snapshot.year})
          </h2>
          <p className="muted small">
            Selected country versus simple average across all countries and global totals.
          </p>
        </div>
        <div className="pill-group">
          <button
            type="button"
            className={`pill ${!showAgeBreakdown ? 'pill-active' : ''}`}
            onClick={() => setShowAgeBreakdown(false)}
          >
            Core metrics
          </button>
          <button
            type="button"
            className={`pill ${showAgeBreakdown ? 'pill-active' : ''}`}
            onClick={() => setShowAgeBreakdown(true)}
          >
            + Population age breakdown
          </button>
        </div>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>{snapshot.country.name}</th>
              <th>YoY ({snapshot.country.iso2Code})</th>
              <th>Avg country</th>
              <th>Global</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>GDP (Nominal, US$)</td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(gdpNominalAgg.selected)}
                </div>
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {gdpNominalAgg.yoySelected ?? '–'}
                </div>
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(gdpNominalAgg.avgCountry)}
                </div>
                {gdpNominalAgg.yoyAvg && (
                  <div className="table-cell-yoy">{gdpNominalAgg.yoyAvg}</div>
                )}
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(gdpNominalAgg.global)}
                </div>
                {gdpNominalAgg.yoyGlobal && (
                  <div className="table-cell-yoy">
                    {gdpNominalAgg.yoyGlobal}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td>GDP (PPP, Intl$)</td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(gdpPPPAgg.selected)}
                </div>
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {gdpPPPAgg.yoySelected ?? '–'}
                </div>
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(gdpPPPAgg.avgCountry)}
                </div>
                {gdpPPPAgg.yoyAvg && (
                  <div className="table-cell-yoy">{gdpPPPAgg.yoyAvg}</div>
                )}
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(gdpPPPAgg.global)}
                </div>
                {gdpPPPAgg.yoyGlobal && (
                  <div className="table-cell-yoy">
                    {gdpPPPAgg.yoyGlobal}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td>GDP per capita (Nominal, US$)</td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(gdpNominalPerCapitaAgg.selected)}
                </div>
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {gdpNominalPerCapitaAgg.yoySelected ?? '–'}
                </div>
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(gdpNominalPerCapitaAgg.avgCountry)}
                </div>
                {gdpNominalPerCapitaAgg.yoyAvg && (
                  <div className="table-cell-yoy">
                    {gdpNominalPerCapitaAgg.yoyAvg}
                  </div>
                )}
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(gdpNominalPerCapitaAgg.global)}
                </div>
                {gdpNominalPerCapitaAgg.yoyGlobal && (
                  <div className="table-cell-yoy">
                    {gdpNominalPerCapitaAgg.yoyGlobal}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td>GDP per capita (PPP, Intl$)</td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(gdpPPPPerCapitaAgg.selected)}
                </div>
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {gdpPPPPerCapitaAgg.yoySelected ?? '–'}
                </div>
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(gdpPPPPerCapitaAgg.avgCountry)}
                </div>
                {gdpPPPPerCapitaAgg.yoyAvg && (
                  <div className="table-cell-yoy">
                    {gdpPPPPerCapitaAgg.yoyAvg}
                  </div>
                )}
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(gdpPPPPerCapitaAgg.global)}
                </div>
                {gdpPPPPerCapitaAgg.yoyGlobal && (
                  <div className="table-cell-yoy">
                    {gdpPPPPerCapitaAgg.yoyGlobal}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <td>Total population</td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(populationAgg.selected)}
                </div>
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {populationAgg.yoySelected ?? '–'}
                </div>
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(populationAgg.avgCountry)}
                </div>
                {populationAgg.yoyAvg && (
                  <div className="table-cell-yoy">{populationAgg.yoyAvg}</div>
                )}
              </td>
              <td className="numeric-cell">
                <div className="table-cell-main">
                  {formatCompactNumber(populationAgg.global)}
                </div>
                {populationAgg.yoyGlobal && (
                  <div className="table-cell-yoy">
                    {populationAgg.yoyGlobal}
                  </div>
                )}
              </td>
            </tr>
            {showAgeBreakdown && (
              <>
                <tr>
                  <td>Population 0–14</td>
                  <td className="numeric-cell">
                    <div className="table-cell-main">
                      {ageGroups[0]?.absolute != null
                        ? formatCompactNumber(ageGroups[0].absolute)
                        : '–'}
                    </div>
                    {ageGroups[0]?.percentageOfPopulation != null && (
                      <div className="table-cell-yoy">
                        {formatPercentage(
                          ageGroups[0].percentageOfPopulation,
                        )}
                      </div>
                    )}
                  </td>
                  <td className="numeric-cell">
                    <div className="table-cell-main">
                      {pop0_14Agg.yoySelected ?? '–'}
                    </div>
                  </td>
                  <td className="numeric-cell">
                    <div className="table-cell-main">
                      {formatCompactNumber(pop0_14Agg.avgCountry)}
                    </div>
                    {pop0_14Agg.yoyAvg && (
                      <div className="table-cell-yoy">
                        {pop0_14Agg.yoyAvg}
                      </div>
                    )}
                  </td>
                  <td className="numeric-cell">
                    <div className="table-cell-main">
                      {formatCompactNumber(pop0_14Agg.global)}
                    </div>
                    {pop0_14Agg.yoyGlobal && (
                      <div className="table-cell-yoy">
                        {pop0_14Agg.yoyGlobal}
                      </div>
                    )}
                  </td>
                </tr>
                <tr>
                  <td>Population 15–64</td>
                  <td className="numeric-cell">
                    <div className="table-cell-main">
                      {ageGroups[1]?.absolute != null
                        ? formatCompactNumber(ageGroups[1].absolute)
                        : '–'}
                    </div>
                    {ageGroups[1]?.percentageOfPopulation != null && (
                      <div className="table-cell-yoy">
                        {formatPercentage(
                          ageGroups[1].percentageOfPopulation,
                        )}
                      </div>
                    )}
                  </td>
                  <td className="numeric-cell">
                    <div className="table-cell-main">
                      {pop15_64Agg.yoySelected ?? '–'}
                    </div>
                  </td>
                  <td className="numeric-cell">
                    <div className="table-cell-main">
                      {formatCompactNumber(pop15_64Agg.avgCountry)}
                    </div>
                    {pop15_64Agg.yoyAvg && (
                      <div className="table-cell-yoy">
                        {pop15_64Agg.yoyAvg}
                      </div>
                    )}
                  </td>
                  <td className="numeric-cell">
                    <div className="table-cell-main">
                      {formatCompactNumber(pop15_64Agg.global)}
                    </div>
                    {pop15_64Agg.yoyGlobal && (
                      <div className="table-cell-yoy">
                        {pop15_64Agg.yoyGlobal}
                      </div>
                    )}
                  </td>
                </tr>
                <tr>
                  <td>Population 65+</td>
                  <td className="numeric-cell">
                    <div className="table-cell-main">
                      {ageGroups[2]?.absolute != null
                        ? formatCompactNumber(ageGroups[2].absolute)
                        : '–'}
                    </div>
                    {ageGroups[2]?.percentageOfPopulation != null && (
                      <div className="table-cell-yoy">
                        {formatPercentage(
                          ageGroups[2].percentageOfPopulation,
                        )}
                      </div>
                    )}
                  </td>
                  <td className="numeric-cell">
                    <div className="table-cell-main">
                      {pop65PlusAgg.yoySelected ?? '–'}
                    </div>
                  </td>
                  <td className="numeric-cell">
                    <div className="table-cell-main">
                      {formatCompactNumber(pop65PlusAgg.avgCountry)}
                    </div>
                    {pop65PlusAgg.yoyAvg && (
                      <div className="table-cell-yoy">
                        {pop65PlusAgg.yoyAvg}
                      </div>
                    )}
                  </td>
                  <td className="numeric-cell">
                    <div className="table-cell-main">
                      {formatCompactNumber(pop65PlusAgg.global)}
                    </div>
                    {pop65PlusAgg.yoyGlobal && (
                      <div className="table-cell-yoy">
                        {pop65PlusAgg.yoyGlobal}
                      </div>
                    )}
                  </td>
                </tr>
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

