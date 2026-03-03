import type { CountryDashboardData, MetricSeries } from '../types';
import { formatCompactNumber, formatPercentage, formatYearRange } from '../utils/numberFormat';

interface Props {
  data?: CountryDashboardData;
}

export function SummarySection({ data }: Props) {
  if (!data) {
    return (
      <section className="summary-section card">
        <h2 className="section-title">Global Country Snapshot</h2>
        <p className="muted">
          Loading country highlights from trusted sources (World Bank, WHO, UN, IMF)...
        </p>
      </section>
    );
  }

  const { summary, range, latestSnapshot } = data;
  const yearRangeLabel = formatYearRange(range.startYear, range.endYear);

  const g = latestSnapshot?.metrics.financial;
  const p = latestSnapshot?.metrics.population;
  const h = latestSnapshot?.metrics.health;
  const geo = latestSnapshot?.metrics.geography;

  const ageGroups = p?.ageBreakdown?.groups ?? [];
  const totalPopulation = p?.total ?? null;

  const latestYear = latestSnapshot?.year;

  const getYoY = (series: MetricSeries[] | undefined, id: string): string | null => {
    if (!series || latestYear == null) return null;
    const s = series.find((m) => m.id === id);
    if (!s) return null;
    const curr = s.points.find((pt) => pt.year === latestYear)?.value;
    const prev = s.points.find((pt) => pt.year === latestYear - 1)?.value;
    if (curr == null || prev == null || prev === 0) return null;
    const pct = ((curr - prev) / Math.abs(prev)) * 100;
    if (!Number.isFinite(pct)) return null;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}% YoY`;
  };

  const gdpNominalYoY = getYoY(data.series.financial, 'gdpNominal');
  const gdpPPPYoy = getYoY(data.series.financial, 'gdpPPP');
  const gdpNominalPerCapitaYoY = getYoY(
    data.series.financial,
    'gdpNominalPerCapita',
  );
  const gdpPPPPerCapitaYoY = getYoY(
    data.series.financial,
    'gdpPPPPerCapita',
  );
  const populationYoY = getYoY(data.series.population, 'populationTotal');
  const lifeExpectancyYoY = getYoY(data.series.health, 'lifeExpectancy');
  const pop0_14YoY = getYoY(data.series.health, 'pop0_14Share');
  const pop15_64YoY = getYoY(data.series.health, 'pop15_64Share');
  const pop65PlusYoY = getYoY(data.series.health, 'pop65PlusShare');

  return (
    <section className="summary-section card">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Country Analytics Overview</p>
          <h1 className="summary-title">
            {summary.name}{' '}
            <span className="summary-code">({summary.iso2Code})</span>
          </h1>
          <p className="muted">
            Data window: {yearRangeLabel}. Metrics sourced from World Bank World Development Indicators
            and complementary UN / WHO datasets where available.
          </p>
        </div>
        <div className="summary-flag">
          <img
            src={`https://flagcdn.com/w80/${summary.iso2Code.toLowerCase()}.png`}
            alt={`${summary.name} flag`}
          />
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <h3>General</h3>
          <dl>
            <div className="summary-row">
              <dt>Region</dt>
              <dd>{summary.region ?? '–'}</dd>
            </div>
            <div className="summary-row">
              <dt>Income level</dt>
              <dd>{summary.incomeLevel ?? '–'}</dd>
            </div>
            <div className="summary-row">
              <dt>Capital city</dt>
              <dd>{summary.capitalCity || '–'}</dd>
            </div>
            <div className="summary-row">
              <dt>Timezone</dt>
              <dd>{summary.timezone ?? '–'}</dd>
            </div>
            <div className="summary-row">
              <dt>Currency</dt>
              <dd>
                {summary.currencyName || summary.currencyCode
                  ? `${summary.currencyName ?? ''}${
                      summary.currencyName && summary.currencyCode ? ' · ' : ''
                    }${summary.currencyCode ?? ''}`
                  : '–'}
                {summary.currencySymbol && (
                  <span className="summary-secondary">
                    Symbol: {summary.currencySymbol}
                  </span>
                )}
              </dd>
            </div>
            <div className="summary-row">
              <dt>Land area</dt>
              <dd>
                {geo?.landAreaKm2 != null
                  ? `${formatCompactNumber(geo.landAreaKm2)} km²`
                  : '–'}
              </dd>
            </div>
            <div className="summary-row">
              <dt>Total area</dt>
              <dd>
                {geo?.totalAreaKm2 != null
                  ? `${formatCompactNumber(geo.totalAreaKm2)} km²`
                  : '–'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="summary-card">
          <h3>Financial metrics</h3>
          <dl>
            <div className="summary-row">
              <dt>GDP (Nominal)</dt>
              <dd>
                <span>{formatCompactNumber(g?.gdpNominal ?? null)}</span>
                {gdpNominalYoY && (
                  <span className="summary-secondary">{gdpNominalYoY}</span>
                )}
              </dd>
            </div>
            <div className="summary-row">
              <dt>GDP (PPP)</dt>
              <dd>
                <span>{formatCompactNumber(g?.gdpPPP ?? null)}</span>
                {gdpPPPYoy && (
                  <span className="summary-secondary">{gdpPPPYoy}</span>
                )}
              </dd>
            </div>
            <div className="summary-row">
              <dt>GDP per capita (Nominal)</dt>
              <dd>
                <span>{formatCompactNumber(g?.gdpNominalPerCapita ?? null)}</span>
                {gdpNominalPerCapitaYoY && (
                  <span className="summary-secondary">
                    {gdpNominalPerCapitaYoY}
                  </span>
                )}
              </dd>
            </div>
            <div className="summary-row">
              <dt>GDP per capita (PPP)</dt>
              <dd>
                <span>{formatCompactNumber(g?.gdpPPPPerCapita ?? null)}</span>
                {gdpPPPPerCapitaYoY && (
                  <span className="summary-secondary">
                    {gdpPPPPerCapitaYoY}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="summary-card">
          <h3>Health & demographics</h3>
          <dl>
            <div className="summary-row">
              <dt>Population (latest)</dt>
              <dd>
                <span>{formatCompactNumber(totalPopulation)}</span>
                {populationYoY && (
                  <span className="summary-secondary">{populationYoY}</span>
                )}
              </dd>
            </div>
            <div className="summary-row">
              <dt>Life expectancy at birth</dt>
              <dd>
                <span>
                  {h?.lifeExpectancy != null
                    ? `${h.lifeExpectancy.toFixed(1)} years`
                    : '–'}
                </span>
                {lifeExpectancyYoY && (
                  <span className="summary-secondary">{lifeExpectancyYoY}</span>
                )}
              </dd>
            </div>
            <div className="summary-row">
              <dt>Population 0–14</dt>
              <dd>
                <span>
                  {ageGroups[0]
                    ? `${formatPercentage(
                        ageGroups[0].percentageOfPopulation,
                      )} · ${formatCompactNumber(ageGroups[0].absolute)}`
                    : '–'}
                </span>
                {pop0_14YoY && (
                  <span className="summary-secondary">{pop0_14YoY}</span>
                )}
              </dd>
            </div>
            <div className="summary-row">
              <dt>Population 15–64</dt>
              <dd>
                <span>
                  {ageGroups[1]
                    ? `${formatPercentage(
                        ageGroups[1].percentageOfPopulation,
                      )} · ${formatCompactNumber(ageGroups[1].absolute)}`
                    : '–'}
                </span>
                {pop15_64YoY && (
                  <span className="summary-secondary">{pop15_64YoY}</span>
                )}
              </dd>
            </div>
            <div className="summary-row">
              <dt>Population 65+</dt>
              <dd>
                <span>
                  {ageGroups[2]
                    ? `${formatPercentage(
                        ageGroups[2].percentageOfPopulation,
                      )} · ${formatCompactNumber(ageGroups[2].absolute)}`
                    : '–'}
                </span>
                {pop65PlusYoY && (
                  <span className="summary-secondary">{pop65PlusYoY}</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

