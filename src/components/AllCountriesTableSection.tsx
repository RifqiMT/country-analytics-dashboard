import { useEffect, useState } from 'react';
import type { GlobalCountryMetricsRow } from '../types';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';
import { formatCompactNumber } from '../utils/numberFormat';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';

interface Props {
  year: number;
  setYear: (year: number) => void;
}

export function AllCountriesTableSection({ year, setYear }: Props) {
  const [rows, setRows] = useState<GlobalCountryMetricsRow[]>([]);
  const [rowsPrev, setRowsPrev] = useState<GlobalCountryMetricsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [sortKey, setSortKey] =
    useState<keyof GlobalCountryMetricsRow>('totalAreaKm2');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [view, setView] = useState<'general' | 'financial' | 'health'>(
    'general',
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(undefined);
      try {
        const [curr, prev] = await Promise.all([
          fetchGlobalCountryMetricsForYear(year),
          fetchGlobalCountryMetricsForYear(year - 1),
        ]);
        if (!cancelled) {
          setRows(curr);
          setRowsPrev(prev);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Failed to load global country table.',
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
  }, [year]);

  const prevByIso3 = new Map<string, GlobalCountryMetricsRow>();
  for (const r of rowsPrev) {
    if (r.iso3Code) {
      prevByIso3.set(r.iso3Code, r);
    } else if (r.iso2Code) {
      prevByIso3.set(r.iso2Code, r);
    }
  }

  function getYoYValue(
    current: GlobalCountryMetricsRow,
    key: keyof GlobalCountryMetricsRow,
  ): string | null {
    const prev =
      (current.iso3Code && prevByIso3.get(current.iso3Code)) ||
      (current.iso2Code && prevByIso3.get(current.iso2Code));
    const currVal = current[key];
    const prevVal = prev?.[key];
    if (
      currVal == null ||
      prevVal == null ||
      typeof currVal !== 'number' ||
      typeof prevVal !== 'number' ||
      prevVal === 0
    ) {
      return null;
    }
    const pct = ((currVal - prevVal) / Math.abs(prevVal)) * 100;
    if (!Number.isFinite(pct)) return null;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    const as = String(av);
    const bs = String(bv);
    return sortDir === 'asc'
      ? as.localeCompare(bs)
      : bs.localeCompare(as);
  });

  function changeSort(next: keyof GlobalCountryMetricsRow) {
    if (sortKey === next) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(next);
      setSortDir(next === 'name' ? 'asc' : 'desc');
    }
  }

  return (
    <section className="card all-countries-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Global country table</h2>
          <p className="muted">
            View all categories for all countries in a given year. Data powered by World Bank World
            Development Indicators (GDP, population, and life expectancy).
          </p>
        </div>
        <div className="pill-group">
          <button
            type="button"
            className={`pill ${view === 'general' ? 'pill-active' : ''}`}
            onClick={() => {
              setView('general');
              setSortKey('totalAreaKm2');
              setSortDir('desc');
            }}
          >
            General
          </button>
          <button
            type="button"
            className={`pill ${view === 'financial' ? 'pill-active' : ''}`}
            onClick={() => {
              setView('financial');
              setSortKey('gdpNominal');
              setSortDir('desc');
            }}
          >
            Financial
          </button>
          <button
            type="button"
            className={`pill ${view === 'health' ? 'pill-active' : ''}`}
            onClick={() => {
              setView('health');
              setSortKey('populationTotal');
              setSortDir('desc');
            }}
          >
            Health &amp; demographics
          </button>
        </div>
      </div>

      {loading && (
        <p className="muted small">Loading all countries for {year}…</p>
      )}
      {error && <p className="muted small">{error}</p>}

      {!loading && !error && (
        <div className="table-wrapper tall">
          <table>
            {view === 'general' && (
              <>
                <thead>
                  <tr>
                    <th
                      onClick={() => changeSort('name')}
                      className="sortable"
                    >
                      Country
                    </th>
                    <th
                      onClick={() => changeSort('iso3Code')}
                      className="sortable"
                    >
                      Code
                    </th>
                    <th
                      onClick={() => changeSort('totalAreaKm2')}
                      className="sortable"
                    >
                      Total area (km²)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    return (
                      <tr key={row.iso2Code}>
                        <td>{row.name}</td>
                        <td>{row.iso3Code ?? row.iso2Code ?? '–'}</td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.totalAreaKm2 != null
                              ? `${formatCompactNumber(row.totalAreaKm2)} km²`
                              : '–'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}
            {view === 'financial' && (
              <>
                <thead>
                  <tr>
                    <th
                      onClick={() => changeSort('name')}
                      className="sortable"
                    >
                      Country
                    </th>
                    <th
                      onClick={() => changeSort('iso3Code')}
                      className="sortable"
                    >
                      Code
                    </th>
                    <th
                      onClick={() => changeSort('gdpNominal')}
                      className="sortable"
                    >
                      GDP Nominal
                    </th>
                    <th
                      onClick={() => changeSort('gdpPPP')}
                      className="sortable"
                    >
                      GDP PPP
                    </th>
                    <th
                      onClick={() => changeSort('gdpNominalPerCapita')}
                      className="sortable"
                    >
                      GDP / Capita
                    </th>
                    <th
                      onClick={() => changeSort('gdpPPPPerCapita')}
                      className="sortable"
                    >
                      GDP / Capita PPP
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const gdpNominalYoY = getYoYValue(row, 'gdpNominal');
                    const gdpPPPYoy = getYoYValue(row, 'gdpPPP');
                    const gdpNominalPerCapitaYoY = getYoYValue(
                      row,
                      'gdpNominalPerCapita',
                    );
                    const gdpPPPPerCapitaYoY = getYoYValue(
                      row,
                      'gdpPPPPerCapita',
                    );
                    return (
                      <tr key={row.iso2Code}>
                        <td>{row.name}</td>
                        <td>{row.iso3Code ?? row.iso2Code ?? '–'}</td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatCompactNumber(row.gdpNominal ?? null)}
                          </div>
                          {gdpNominalYoY && (
                            <div className="table-cell-yoy">
                              {gdpNominalYoY}
                            </div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatCompactNumber(row.gdpPPP ?? null)}
                          </div>
                          {gdpPPPYoy && (
                            <div className="table-cell-yoy">{gdpPPPYoy}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatCompactNumber(
                              row.gdpNominalPerCapita ?? null,
                            )}
                          </div>
                          {gdpNominalPerCapitaYoY && (
                            <div className="table-cell-yoy">
                              {gdpNominalPerCapitaYoY}
                            </div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatCompactNumber(
                              row.gdpPPPPerCapita ?? null,
                            )}
                          </div>
                          {gdpPPPPerCapitaYoY && (
                            <div className="table-cell-yoy">
                              {gdpPPPPerCapitaYoY}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}
            {view === 'health' && (
              <>
                <thead>
                  <tr>
                    <th
                      onClick={() => changeSort('name')}
                      className="sortable"
                    >
                      Country
                    </th>
                    <th
                      onClick={() => changeSort('iso3Code')}
                      className="sortable"
                    >
                      Code
                    </th>
                    <th
                      onClick={() => changeSort('populationTotal')}
                      className="sortable"
                    >
                      Pop total
                    </th>
                    <th
                      onClick={() => changeSort('population0_14')}
                      className="sortable"
                    >
                      Pop 0–14
                    </th>
                    <th
                      onClick={() => changeSort('population15_64')}
                      className="sortable"
                    >
                      Pop 15–64
                    </th>
                    <th
                      onClick={() => changeSort('population65Plus')}
                      className="sortable"
                    >
                      Pop 65+
                    </th>
                    <th
                      onClick={() => changeSort('lifeExpectancy')}
                      className="sortable"
                    >
                      Life expectancy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const popTotalYoY = getYoYValue(row, 'populationTotal');
                    const pop0_14YoY = getYoYValue(row, 'population0_14');
                    const pop15_64YoY = getYoYValue(row, 'population15_64');
                    const pop65PlusYoY = getYoYValue(row, 'population65Plus');
                    const lifeYoY = getYoYValue(row, 'lifeExpectancy');
                    return (
                      <tr key={row.iso2Code}>
                        <td>{row.name}</td>
                        <td>{row.iso3Code ?? row.iso2Code ?? '–'}</td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatCompactNumber(row.populationTotal ?? null)}
                          </div>
                          {popTotalYoY && (
                            <div className="table-cell-yoy">{popTotalYoY}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatCompactNumber(row.population0_14 ?? null)}
                          </div>
                          {pop0_14YoY && (
                            <div className="table-cell-yoy">{pop0_14YoY}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatCompactNumber(row.population15_64 ?? null)}
                          </div>
                          {pop15_64YoY && (
                            <div className="table-cell-yoy">{pop15_64YoY}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatCompactNumber(row.population65Plus ?? null)}
                          </div>
                          {pop65PlusYoY && (
                            <div className="table-cell-yoy">
                              {pop65PlusYoY}
                            </div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.lifeExpectancy != null
                              ? row.lifeExpectancy.toFixed(1)
                              : '–'}
                          </div>
                          {lifeYoY && (
                            <div className="table-cell-yoy">{lifeYoY}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}
          </table>
        </div>
      )}
    </section>
  );
}

