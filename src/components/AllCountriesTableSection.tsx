import { useEffect, useMemo, useState } from 'react';
import type { GlobalCountryMetricsRow } from '../types';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';
import { formatCompactNumber, formatPercentage } from '../utils/numberFormat';
import { formatGrowthChangeShort } from '../utils/growthFormat';
import { useToast } from './ToastProvider';

interface Props {
  year: number;
  setYear: (year: number) => void;
  /** When set, only show countries in this region (World Bank region name). */
  region?: string | null;
  /** Increment to force refetch of global table data (e.g. after "Refresh all data"). */
  refreshTrigger?: number;
}

/** Convert ISO 3166-1 alpha-2 code to flag emoji (e.g. "US" → 🇺🇸). */
function getFlagEmoji(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return '';
  return iso2
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('');
}

export function AllCountriesTableSection({ year, region = null, refreshTrigger = 0 }: Props) {
  const { showToast, dismissToast } = useToast();
  const [rows, setRows] = useState<GlobalCountryMetricsRow[]>([]);
  const [rowsPrev, setRowsPrev] = useState<GlobalCountryMetricsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [sortKey, setSortKey] =
    useState<keyof GlobalCountryMetricsRow>('totalAreaKm2');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [view, setView] = useState<'general' | 'financial' | 'health' | 'education'>(
    'general',
  );

  useEffect(() => {
    let cancelled = false;
    const loadingId = showToast({
      type: 'loading',
      message: `Loading global country table for ${year}…`,
    });
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
          showToast({
            type: 'success',
            message: `Global country table updated for ${year}.`,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Failed to load global country table.',
          );
          showToast({
            type: 'error',
            message: 'Failed to load global country table.',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
        dismissToast(loadingId);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [year, refreshTrigger, dismissToast, showToast]);

  const displayRows = useMemo(
    () => (region ? rows.filter((r) => r.region === region) : rows),
    [rows, region],
  );
  const displayRowsPrev = useMemo(
    () => (region ? rowsPrev.filter((r) => r.region === region) : rowsPrev),
    [rowsPrev, region],
  );

  const prevByIso3 = new Map<string, GlobalCountryMetricsRow>();
  for (const r of displayRowsPrev) {
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
      (current.iso3Code ? prevByIso3.get(current.iso3Code) : undefined) ??
      (current.iso2Code ? prevByIso3.get(current.iso2Code) : undefined);
    const currVal = current[key];
    const prevVal = prev != null ? prev[key] : undefined;
    if (currVal == null || typeof currVal !== 'number') return null;
    return formatGrowthChangeShort(
      currVal as number,
      prevVal != null && typeof prevVal === 'number' ? prevVal : null,
      key as string,
    );
  }

  const sorted = [...displayRows].sort((a, b) => {
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
          <button
            type="button"
            className={`pill ${view === 'education' ? 'pill-active' : ''}`}
            onClick={() => {
              setView('education');
              setSortKey('primaryCompletionRate');
              setSortDir('desc');
            }}
          >
            Education
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
                      onClick={() => changeSort('region')}
                      className="sortable"
                    >
                      Region
                    </th>
                    <th
                      onClick={() => changeSort('governmentType')}
                      className="sortable"
                    >
                      Government type
                    </th>
                    <th
                      onClick={() => changeSort('headOfGovernmentType')}
                      className="sortable"
                    >
                      Head of government
                    </th>
                    <th
                      onClick={() => changeSort('totalAreaKm2')}
                      className="sortable"
                    >
                      Total area (km²)
                    </th>
                    <th
                      onClick={() => changeSort('eezKm2')}
                      className="sortable"
                    >
                      EEZ (km²)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    return (
                      <tr key={row.iso2Code}>
                        <td>
                          <span className="country-cell">
                            {getFlagEmoji(row.iso2Code)} {row.name}
                          </span>
                        </td>
                        <td>{row.iso3Code ?? row.iso2Code ?? '–'}</td>
                        <td>{row.region ?? '–'}</td>
                        <td>{row.governmentType ?? '–'}</td>
                        <td>{row.headOfGovernmentType ?? '–'}</td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.totalAreaKm2 != null
                              ? `${formatCompactNumber(row.totalAreaKm2)} km²`
                              : '–'}
                          </div>
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.eezKm2 != null
                              ? `${formatCompactNumber(row.eezKm2)} km²`
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
                    <th
                      onClick={() => changeSort('govDebtUSD')}
                      className="sortable"
                    >
                      Gov. debt (USD)
                    </th>
                    <th
                      onClick={() => changeSort('inflationCPI')}
                      className="sortable"
                    >
                      Inflation (CPI, %)
                    </th>
                    <th
                      onClick={() => changeSort('govDebtPercentGDP')}
                      className="sortable"
                    >
                      Gov. debt (% GDP)
                    </th>
                    <th
                      onClick={() => changeSort('interestRate')}
                      className="sortable"
                    >
                      Lending rate (%)
                    </th>
                    <th
                      onClick={() => changeSort('unemploymentRate')}
                      className="sortable"
                    >
                      Unemployment rate (%)
                    </th>
                    <th
                      onClick={() => changeSort('unemployedTotal')}
                      className="sortable"
                    >
                      Unemployed (number)
                    </th>
                    <th
                      onClick={() => changeSort('labourForceTotal')}
                      className="sortable"
                    >
                      Labour force (total)
                    </th>
                    <th
                      onClick={() => changeSort('povertyHeadcount215')}
                      className="sortable"
                    >
                      Poverty ($2.15/day, %)
                    </th>
                    <th
                      onClick={() => changeSort('povertyHeadcountNational')}
                      className="sortable"
                    >
                      Poverty (national line, %)
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
                    const inflationYoY = getYoYValue(row, 'inflationCPI');
                    const govDebtYoY = getYoYValue(row, 'govDebtPercentGDP');
                    const govDebtUSDYoY = getYoYValue(row, 'govDebtUSD');
                    const interestYoY = getYoYValue(row, 'interestRate');
                    const unemploymentYoY = getYoYValue(
                      row,
                      'unemploymentRate',
                    );
                    const unemployedTotalYoY = getYoYValue(
                      row,
                      'unemployedTotal',
                    );
                    const labourForceTotalYoY = getYoYValue(
                      row,
                      'labourForceTotal',
                    );
                    const pov215YoY = getYoYValue(
                      row,
                      'povertyHeadcount215',
                    );
                    const povNatYoY = getYoYValue(
                      row,
                      'povertyHeadcountNational',
                    );
                    return (
                      <tr key={row.iso2Code}>
                        <td>
                          <span className="country-cell">
                            {getFlagEmoji(row.iso2Code)} {row.name}
                          </span>
                        </td>
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
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatCompactNumber(row.govDebtUSD ?? null)}
                          </div>
                          {govDebtUSDYoY && (
                            <div className="table-cell-yoy">{govDebtUSDYoY}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatPercentage(row.inflationCPI ?? null)}
                          </div>
                          {inflationYoY && (
                            <div className="table-cell-yoy">
                              {inflationYoY}
                            </div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatPercentage(row.govDebtPercentGDP ?? null)}
                          </div>
                          {govDebtYoY && (
                            <div className="table-cell-yoy">{govDebtYoY}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatPercentage(row.interestRate ?? null)}
                          </div>
                          {interestYoY && (
                            <div className="table-cell-yoy">{interestYoY}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatPercentage(row.unemploymentRate ?? null)}
                          </div>
                          {unemploymentYoY && (
                            <div className="table-cell-yoy">
                              {unemploymentYoY}
                            </div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatCompactNumber(row.unemployedTotal ?? null)}
                          </div>
                          {unemployedTotalYoY && (
                            <div className="table-cell-yoy">
                              {unemployedTotalYoY}
                            </div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatCompactNumber(row.labourForceTotal ?? null)}
                          </div>
                          {labourForceTotalYoY && (
                            <div className="table-cell-yoy">
                              {labourForceTotalYoY}
                            </div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatPercentage(row.povertyHeadcount215 ?? null)}
                          </div>
                          {pov215YoY && (
                            <div className="table-cell-yoy">{pov215YoY}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatPercentage(
                              row.povertyHeadcountNational ?? null,
                            )}
                          </div>
                          {povNatYoY && (
                            <div className="table-cell-yoy">{povNatYoY}</div>
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
                    <th
                      onClick={() => changeSort('under5MortalityRate')}
                      className="sortable"
                    >
                      Under-5 mortality (per 1,000)
                    </th>
                    <th
                      onClick={() => changeSort('maternalMortalityRatio')}
                      className="sortable"
                    >
                      Maternal mortality (per 100,000)
                    </th>
                    <th
                      onClick={() =>
                        changeSort('undernourishmentPrevalence')
                      }
                      className="sortable"
                    >
                      Undernourishment (% of pop.)
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
                    const under5YoY = getYoYValue(
                      row,
                      'under5MortalityRate',
                    );
                    const maternalYoY = getYoYValue(
                      row,
                      'maternalMortalityRatio',
                    );
                    const malnutritionYoY = getYoYValue(
                      row,
                      'undernourishmentPrevalence',
                    );
                    return (
                      <tr key={row.iso2Code}>
                        <td>
                          <span className="country-cell">
                            {getFlagEmoji(row.iso2Code)} {row.name}
                          </span>
                        </td>
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
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.under5MortalityRate != null
                              ? row.under5MortalityRate.toFixed(1)
                              : '–'}
                          </div>
                          {under5YoY && (
                            <div className="table-cell-yoy">{under5YoY}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.maternalMortalityRatio != null
                              ? row.maternalMortalityRatio.toFixed(0)
                              : '–'}
                          </div>
                          {maternalYoY && (
                            <div className="table-cell-yoy">{maternalYoY}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {formatPercentage(
                              row.undernourishmentPrevalence ?? null,
                            )}
                          </div>
                          {malnutritionYoY && (
                            <div className="table-cell-yoy">
                              {malnutritionYoY}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}
            {view === 'education' && (
              <>
                <thead>
                  <tr>
                    <th onClick={() => changeSort('name')} className="sortable">Country</th>
                    <th onClick={() => changeSort('outOfSchoolPrimaryPct')} className="sortable">Out-of-school (primary, %)</th>
                    <th onClick={() => changeSort('outOfSchoolSecondaryPct')} className="sortable">Out-of-school (secondary, %)</th>
                    <th onClick={() => changeSort('outOfSchoolTertiaryPct')} className="sortable">Out-of-school (tertiary, %)</th>
                    <th onClick={() => changeSort('primaryCompletionRate')} className="sortable">Primary completion (gross, %)</th>
                    <th onClick={() => changeSort('secondaryCompletionRate')} className="sortable">Secondary completion (gross, %)</th>
                    <th onClick={() => changeSort('tertiaryCompletionRate')} className="sortable">Tertiary completion (gross, %)</th>
                    <th onClick={() => changeSort('minProficiencyReadingPct')} className="sortable">Min. reading prof. (%)</th>
                    <th onClick={() => changeSort('literacyRateAdultPct')} className="sortable">Adult literacy (%)</th>
                    <th onClick={() => changeSort('genderParityIndexPrimary')} className="sortable">GPI (primary)</th>
                    <th onClick={() => changeSort('genderParityIndexSecondary')} className="sortable">GPI (secondary)</th>
                    <th onClick={() => changeSort('genderParityIndexTertiary')} className="sortable">GPI (tertiary)</th>
                    <th onClick={() => changeSort('trainedTeachersPrimaryPct')} className="sortable">Trained teachers primary (%)</th>
                    <th onClick={() => changeSort('trainedTeachersSecondaryPct')} className="sortable">Trained teachers secondary (%)</th>
                    <th onClick={() => changeSort('trainedTeachersTertiaryPct')} className="sortable">Trained teachers tertiary (%)</th>
                    <th onClick={() => changeSort('publicExpenditureEducationPctGDP')} className="sortable">Educ. expend. (% GDP)</th>
                    <th onClick={() => changeSort('primaryPupilsTotal')} className="sortable">Primary enrollment (total)</th>
                    <th onClick={() => changeSort('primaryEnrollmentPct')} className="sortable">Primary enroll. (% gross)</th>
                    <th onClick={() => changeSort('secondaryPupilsTotal')} className="sortable">Secondary enrollment (total)</th>
                    <th onClick={() => changeSort('secondaryEnrollmentPct')} className="sortable">Secondary enroll. (% gross)</th>
                    <th onClick={() => changeSort('tertiaryEnrollmentPct')} className="sortable">Tertiary enroll. (% gross)</th>
                    <th onClick={() => changeSort('tertiaryEnrollmentTotal')} className="sortable">Tertiary enroll. (total)</th>
                    <th onClick={() => changeSort('primarySchoolsTotal')} className="sortable">Primary teachers</th>
                    <th onClick={() => changeSort('secondarySchoolsTotal')} className="sortable">Secondary teachers</th>
                    <th onClick={() => changeSort('tertiaryInstitutionsTotal')} className="sortable">Tertiary teachers</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const fmtPct = (v: number | null | undefined) =>
                      v != null ? v.toFixed(1) + '%' : '–';
                    const fmtGPI = (v: number | null | undefined) =>
                      v != null ? (v >= 10 ? (v / 100).toFixed(2) : v.toFixed(2)) : '–';
                    return (
                      <tr key={row.iso2Code}>
                        <td>
                          <span className="country-cell">
                            {getFlagEmoji(row.iso2Code)} {row.name}
                          </span>
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {fmtPct(row.outOfSchoolPrimaryPct)}
                          </div>
                          {getYoYValue(row, 'outOfSchoolPrimaryPct') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'outOfSchoolPrimaryPct')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {fmtPct(row.outOfSchoolSecondaryPct)}
                          </div>
                          {getYoYValue(row, 'outOfSchoolSecondaryPct') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'outOfSchoolSecondaryPct')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {fmtPct(row.outOfSchoolTertiaryPct)}
                          </div>
                          {getYoYValue(row, 'outOfSchoolTertiaryPct') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'outOfSchoolTertiaryPct')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtPct(row.primaryCompletionRate)}</div>
                          {getYoYValue(row, 'primaryCompletionRate') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'primaryCompletionRate')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtPct(row.secondaryCompletionRate)}</div>
                          {getYoYValue(row, 'secondaryCompletionRate') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'secondaryCompletionRate')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtPct(row.tertiaryCompletionRate)}</div>
                          {getYoYValue(row, 'tertiaryCompletionRate') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'tertiaryCompletionRate')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtPct(row.minProficiencyReadingPct)}</div>
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtPct(row.literacyRateAdultPct)}</div>
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtGPI(row.genderParityIndexPrimary)}</div>
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtGPI(row.genderParityIndexSecondary)}</div>
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtGPI(row.genderParityIndexTertiary)}</div>
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtPct(row.trainedTeachersPrimaryPct)}</div>
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtPct(row.trainedTeachersSecondaryPct)}</div>
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtPct(row.trainedTeachersTertiaryPct)}</div>
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.publicExpenditureEducationPctGDP != null
                              ? row.publicExpenditureEducationPctGDP.toFixed(2) + '%'
                              : '–'}
                          </div>
                          {getYoYValue(row, 'publicExpenditureEducationPctGDP') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'publicExpenditureEducationPctGDP')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.primaryPupilsTotal != null ? formatCompactNumber(row.primaryPupilsTotal) : '–'}
                          </div>
                          {getYoYValue(row, 'primaryPupilsTotal') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'primaryPupilsTotal')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtPct(row.primaryEnrollmentPct)}</div>
                          {getYoYValue(row, 'primaryEnrollmentPct') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'primaryEnrollmentPct')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.secondaryPupilsTotal != null ? formatCompactNumber(row.secondaryPupilsTotal) : '–'}
                          </div>
                          {getYoYValue(row, 'secondaryPupilsTotal') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'secondaryPupilsTotal')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtPct(row.secondaryEnrollmentPct)}</div>
                          {getYoYValue(row, 'secondaryEnrollmentPct') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'secondaryEnrollmentPct')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">{fmtPct(row.tertiaryEnrollmentPct)}</div>
                          {getYoYValue(row, 'tertiaryEnrollmentPct') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'tertiaryEnrollmentPct')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.tertiaryEnrollmentTotal != null ? formatCompactNumber(row.tertiaryEnrollmentTotal) : '–'}
                          </div>
                          {getYoYValue(row, 'tertiaryEnrollmentTotal') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'tertiaryEnrollmentTotal')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.primarySchoolsTotal != null ? formatCompactNumber(row.primarySchoolsTotal) : '–'}
                          </div>
                          {getYoYValue(row, 'primarySchoolsTotal') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'primarySchoolsTotal')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.secondarySchoolsTotal != null ? formatCompactNumber(row.secondarySchoolsTotal) : '–'}
                          </div>
                          {getYoYValue(row, 'secondarySchoolsTotal') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'secondarySchoolsTotal')}</div>
                          )}
                        </td>
                        <td className="numeric-cell">
                          <div className="table-cell-main">
                            {row.tertiaryInstitutionsTotal != null ? formatCompactNumber(row.tertiaryInstitutionsTotal) : '–'}
                          </div>
                          {getYoYValue(row, 'tertiaryInstitutionsTotal') && (
                            <div className="table-cell-yoy">{getYoYValue(row, 'tertiaryInstitutionsTotal')}</div>
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
      {!loading && !error && view === 'financial' && (
        <p className="muted small" style={{ marginTop: '0.5rem' }}>
          Government debt: World Bank (IMF Government Finance Statistics) and IMF
          World Economic Outlook (WEO) for missing countries. Inflation, gov. debt,
          and lending rate show the latest available value when data for the selected
          year is missing; where no country data exists, gov. debt and lending rate
          show the world median as an estimate.
        </p>
      )}
    </section>
  );
}

