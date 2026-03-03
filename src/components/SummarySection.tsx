import type { CountryDashboardData, CountrySummary, MetricSeries } from '../types';
import { formatCompactNumber, formatPercentage, formatYearRange } from '../utils/numberFormat';

const SvgIcon = ({ d, className }: { d: string; className?: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden className={className}>
    <path d={d} fill="currentColor" />
  </svg>
);

function GeneralCard({ summary, geo }: { summary: CountrySummary; geo?: { landAreaKm2?: number | null; totalAreaKm2?: number | null; eezKm2?: number | null } }) {
  const groups: { label: string; items: { icon: string; label: string; value: React.ReactNode; badge?: boolean }[] }[] = [
    {
      label: 'Location & classification',
      items: [
        { icon: 'M8 1.5a5 5 0 0 0-5 5c0 3.25 3.5 6 4.4 6.7.36.28.84.28 1.2 0C9.5 12.5 13 9.75 13 6.5a5 5 0 0 0-5-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z', label: 'Region', value: summary.region ?? '–', badge: true },
        { icon: 'M4.75 2A1.75 1.75 0 0 0 3 3.75v8.5c0 .97.78 1.75 1.75 1.75h6.5A1.75 1.75 0 0 0 13 12.25v-8.5A1.75 1.75 0 0 0 11.25 2h-6.5Zm0 1.5h6.5a.25.25 0 0 1 .25.25v8.5a.25.25 0 0 1-.25.25h-6.5a.25.25 0 0 1-.25-.25v-8.5a.25.25 0 0 1 .25-.25Z', label: 'Income level', value: summary.incomeLevel ?? '–', badge: true },
      ],
    },
    {
      label: 'Government',
      items: [
        { icon: 'M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Z', label: 'Government type', value: summary.governmentType ?? '–', badge: true },
        { icon: 'M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Z', label: 'Head of government', value: summary.headOfGovernmentType ?? '–' },
      ],
    },
    {
      label: 'Administrative',
      items: [
        { icon: 'M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.14 4.5 7.5 4.5 7.5s4.5-4.36 4.5-7.5A4.5 4.5 0 0 0 8 1.5Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z', label: 'Capital city', value: summary.capitalCity || '–' },
        { icon: 'M3.25 8A4.75 4.75 0 0 1 8 3.25a.75.75 0 0 1 0 1.5A3.25 3.25 0 1 0 11.25 8a.75.75 0 0 1 1.5 0A4.75 4.75 0 1 1 3.25 8Z', label: 'Timezone', value: summary.timezone ?? '–' },
      ],
    },
    {
      label: 'Economy',
      items: [
        {
          icon: 'M3 11.5a.75.75 0 0 1 .75-.75h2V4.5a.75.75 0 0 1 1.5 0v6.25h2l.1.01a.75.75 0 0 1-.1 1.49h-2v.75a.75.75 0 0 1-1.5 0V12.5h-2A.75.75 0 0 1 3 11.5Z',
          label: 'Currency',
          value:
            summary.currencyName || summary.currencyCode || summary.currencySymbol
              ? [
                  summary.currencyName
                    ? `${summary.currencyName}${summary.currencySymbol ? ` (${summary.currencySymbol})` : ''}`
                    : summary.currencySymbol ?? '',
                  summary.currencyCode ?? '',
                ]
                  .filter(Boolean)
                  .join(' · ')
              : '–',
        },
      ],
    },
    {
      label: 'Geography',
      items: [
        { icon: 'M3 4.25A1.25 1.25 0 0 1 4.25 3h7.5A1.25 1.25 0 0 1 13 4.25v7.5A1.25 1.25 0 0 1 11.75 13h-7.5A1.25 1.25 0 0 1 3 11.75v-7.5Zm1.5.25v7h7v-7h-7Z', label: 'Land area', value: geo?.landAreaKm2 != null ? `${formatCompactNumber(geo.landAreaKm2)} km²` : '–' },
        { icon: 'M2.75 4A1.75 1.75 0 0 1 4.5 2.25h7A1.75 1.75 0 0 1 13.25 4v7A1.75 1.75 0 0 1 11.5 12.75h-7A1.75 1.75 0 0 1 2.75 11V4Zm1.75-.25a.25.25 0 0 0-.25.25v7c0 .14.11.25.25.25h7a.25.25 0 0 0 .25-.25v-7a.25.25 0 0 0-.25-.25h-7Z', label: 'Total area', value: geo?.totalAreaKm2 != null ? `${formatCompactNumber(geo.totalAreaKm2)} km²` : '–' },
        { icon: 'M2 4.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z', label: 'EEZ', value: geo?.eezKm2 != null ? `${formatCompactNumber(geo.eezKm2)} km²` : '–' },
      ],
    },
  ];

  return (
    <div className="summary-card general-card">
      <h3 className="general-card-title">General</h3>
      <div className="general-groups">
        {groups.map((group) => (
          <div key={group.label} className="general-group">
            <div className="general-group-label">{group.label}</div>
            <div className="general-grid">
              {group.items.map(({ icon, label, value, badge }) => (
                <div key={label} className="general-item">
                  <div className="general-item-header">
                    <span className="general-item-icon">
                      <SvgIcon d={icon} />
                    </span>
                    <span className="general-item-label">{label}</span>
                  </div>
                  <div className={`general-item-value ${badge ? 'general-item-badge' : ''}`}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {summary.government && (
        <div className="general-footer">
          <span className="general-footer-label">Government</span>
          <span className="general-footer-value">{summary.government}</span>
        </div>
      )}
    </div>
  );
}

function getYoYDirection(yoy: string | null): 'up' | 'down' | 'flat' | null {
  if (!yoy) return null;
  const match = yoy.match(/^([+-]?)([\d.]+)%/);
  if (!match) return null;
  const sign = match[1];
  const pct = parseFloat(match[2]);
  if (sign === '+') return 'up';
  if (sign === '-' || pct < 0) return 'down';
  return 'flat';
}

function FinancialCard({
  g,
  getYoY,
  series,
}: {
  g: NonNullable<CountryDashboardData['latestSnapshot']>['metrics']['financial'] | undefined;
  getYoY: (s: MetricSeries[] | undefined, id: string) => string | null;
  series: MetricSeries[] | undefined;
}) {
  const groups: {
    label: string;
    items: {
      icon: string;
      label: string;
      value: React.ReactNode;
      yoy: string | null;
    }[];
  }[] = [
    {
      label: 'GDP',
      items: [
        { icon: 'M3 11.5a.75.75 0 0 1 .75-.75h2V4.5a.75.75 0 0 1 1.5 0v6.25h2l.1.01a.75.75 0 0 1-.1 1.49h-2v.75a.75.75 0 0 1-1.5 0V12.5h-2A.75.75 0 0 1 3 11.5Z', label: 'GDP (Nominal)', value: formatCompactNumber(g?.gdpNominal ?? null), yoy: getYoY(series, 'gdpNominal') },
        { icon: 'M4 3.25A1.25 1.25 0 0 1 5.25 2h5.5A1.25 1.25 0 0 1 12 3.25v9.5a.75.75 0 0 1-1.2.6L8 11.5l-2.8 1.85A.75.75 0 0 1 4 12.75v-9.5Z', label: 'GDP (PPP)', value: formatCompactNumber(g?.gdpPPP ?? null), yoy: getYoY(series, 'gdpPPP') },
        { icon: 'M8 2.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm0 5.5a4.25 4.25 0 0 1 4.24 3.8.75.75 0 0 1-.74.7H4.5a.75.75 0 0 1-.74-.7A4.25 4.25 0 0 1 8 7.75Z', label: 'GDP / Capita (Nominal)', value: formatCompactNumber(g?.gdpNominalPerCapita ?? null), yoy: getYoY(series, 'gdpNominalPerCapita') },
        { icon: 'M3.25 3A.75.75 0 0 1 4 2.25h8A.75.75 0 0 1 12.75 3v2A2.75 2.75 0 0 1 10 7.75H8.5v1H11a.75.75 0 0 1 0 1.5H8.5v1.5a.75.75 0 0 1-1.5 0V10.25H5a.75.75 0 0 1 0-1.5h2V7.75H6A2.75 2.75 0 0 1 3.25 5V3Z', label: 'GDP / Capita (PPP)', value: formatCompactNumber(g?.gdpPPPPerCapita ?? null), yoy: getYoY(series, 'gdpPPPPerCapita') },
      ],
    },
    {
      label: 'Debt',
      items: [
        { icon: 'M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Z', label: 'Gov. debt (USD)', value: formatCompactNumber(g?.govDebtUSD ?? null), yoy: getYoY(series, 'govDebtUSD') },
        { icon: 'M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .14.11.25.25.25h6.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-6.5Z', label: 'Gov. debt (% GDP)', value: g?.govDebtPercentGDP != null ? `${g.govDebtPercentGDP.toFixed(1)}%` : '–', yoy: getYoY(series, 'govDebtPercentGDP') },
      ],
    },
    {
      label: 'Inflation & rates',
      items: [
        { icon: 'M3.25 8A4.75 4.75 0 0 1 8 3.25a.75.75 0 0 1 0 1.5A3.25 3.25 0 1 0 11.25 8a.75.75 0 0 1 1.5 0A4.75 4.75 0 1 1 3.25 8Z', label: 'Inflation (CPI, %)', value: g?.inflationCPI != null ? `${g.inflationCPI.toFixed(1)}%` : '–', yoy: getYoY(series, 'inflationCPI') },
        { icon: 'M4.75 2A1.75 1.75 0 0 0 3 3.75v8.5c0 .97.78 1.75 1.75 1.75h6.5A1.75 1.75 0 0 0 13 12.25v-8.5A1.75 1.75 0 0 0 11.25 2h-6.5ZM6 5v6l4-3-4-3Z', label: 'Lending interest rate', value: g?.interestRate != null ? `${g.interestRate.toFixed(1)}%` : '–', yoy: getYoY(series, 'interestRate') },
      ],
    },
  ];

  return (
    <div className="summary-card financial-card">
      <h3 className="financial-card-title">Financial metrics</h3>
      <div className="financial-groups">
        {groups.map((group) => (
          <div key={group.label} className="financial-group">
            <div className="financial-group-label">{group.label}</div>
            <div className="financial-grid">
              {group.items.map(({ icon, label, value, yoy }) => {
                const dir = getYoYDirection(yoy);
                return (
                  <div key={label} className="financial-item">
                    <div className="financial-item-header">
                      <span className="financial-item-icon">
                        <SvgIcon d={icon} />
                      </span>
                      <span className="financial-item-label">{label}</span>
                    </div>
                    <div className="financial-item-body">
                      <span className="financial-item-value">{value}</span>
                      {yoy && (
                        <span className={`financial-item-yoy financial-item-yoy-${dir ?? 'flat'}`}>
                          {yoy}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthCard({
  p,
  h,
  getYoY,
  series,
}: {
  p: NonNullable<CountryDashboardData['latestSnapshot']>['metrics']['population'] | undefined;
  h: NonNullable<CountryDashboardData['latestSnapshot']>['metrics']['health'] | undefined;
  getYoY: (s: MetricSeries[] | undefined, id: string) => string | null;
  series: { population: MetricSeries[]; health: MetricSeries[] };
}) {
  const ageGroups = p?.ageBreakdown?.groups ?? [];
  const totalPopulation = p?.total ?? null;

  const groups: {
    label: string;
    items: {
      icon: string;
      label: string;
      value: React.ReactNode;
      yoy: string | null;
    }[];
  }[] = [
    {
      label: 'Population',
      items: [
        { icon: 'M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Z', label: 'Total population', value: formatCompactNumber(totalPopulation), yoy: getYoY(series.population, 'populationTotal') },
      ],
    },
    {
      label: 'Health',
      items: [
        { icon: 'M4.75 2A1.75 1.75 0 0 0 3 3.75v8.5c0 .97.78 1.75 1.75 1.75h6.5A1.75 1.75 0 0 0 13 12.25v-8.5A1.75 1.75 0 0 0 11.25 2h-6.5Z', label: 'Life expectancy', value: h?.lifeExpectancy != null ? `${h.lifeExpectancy.toFixed(1)} years` : '–', yoy: getYoY(series.health, 'lifeExpectancy') },
      ],
    },
    {
      label: 'Age structure',
      items: [
        { icon: 'M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Z', label: '0–14', value: ageGroups[0] ? `${formatPercentage(ageGroups[0].percentageOfPopulation)} · ${formatCompactNumber(ageGroups[0].absolute)}` : '–', yoy: getYoY(series.health, 'pop0_14Share') },
        { icon: 'M4.75 2A1.75 1.75 0 0 0 3 3.75v8.5c0 .97.78 1.75 1.75 1.75h6.5A1.75 1.75 0 0 0 13 12.25v-8.5A1.75 1.75 0 0 0 11.25 2h-6.5Z', label: '15–64', value: ageGroups[1] ? `${formatPercentage(ageGroups[1].percentageOfPopulation)} · ${formatCompactNumber(ageGroups[1].absolute)}` : '–', yoy: getYoY(series.health, 'pop15_64Share') },
        { icon: 'M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.14 4.5 7.5 4.5 7.5s4.5-4.36 4.5-7.5A4.5 4.5 0 0 0 8 1.5Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z', label: '65+', value: ageGroups[2] ? `${formatPercentage(ageGroups[2].percentageOfPopulation)} · ${formatCompactNumber(ageGroups[2].absolute)}` : '–', yoy: getYoY(series.health, 'pop65PlusShare') },
      ],
    },
  ];

  return (
    <div className="summary-card health-card">
      <h3 className="health-card-title">Health & demographics</h3>
      <div className="health-groups">
        {groups.map((group) => (
          <div key={group.label} className="health-group">
            <div className="health-group-label">{group.label}</div>
            <div className="health-grid">
              {group.items.map(({ icon, label, value, yoy }) => {
                const dir = getYoYDirection(yoy);
                return (
                  <div key={label} className="health-item">
                    <div className="health-item-header">
                      <span className="health-item-icon">
                        <SvgIcon d={icon} />
                      </span>
                      <span className="health-item-label">{label}</span>
                    </div>
                    <div className="health-item-body">
                      <span className="health-item-value">{value}</span>
                      {yoy && (
                        <span className={`health-item-yoy health-item-yoy-${dir ?? 'flat'}`}>
                          {yoy}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  return (
    <section className="summary-section card">
      <div className="overview-header">
        <div className="overview-header-main">
          <div className="overview-header-top">
            <span className="overview-eyebrow">Country Analytics Overview</span>
            <span className="overview-badge">{yearRangeLabel}</span>
          </div>
          <div className="overview-title-row">
            <h1 className="overview-title">
              {summary.name}
              <span className="overview-code">({summary.iso2Code})</span>
            </h1>
            <div className="overview-flag">
              <img
                src={`https://flagcdn.com/w80/${summary.iso2Code.toLowerCase()}.png`}
                alt={`${summary.name} flag`}
              />
            </div>
          </div>
          <div className="overview-sources">
            <span className="overview-sources-label">Data sources</span>
            <div className="overview-sources-chips">
              <span className="overview-chip">World Bank</span>
              <span className="overview-chip">UN</span>
              <span className="overview-chip">WHO</span>
              <span className="overview-chip">IMF</span>
            </div>
          </div>
        </div>
      </div>

      <div className="summary-grid">
        <GeneralCard summary={summary} geo={geo} />
        <FinancialCard g={g} getYoY={getYoY} series={data.series.financial} />
        <HealthCard p={p} h={h} getYoY={getYoY} series={data.series} />
      </div>
    </section>
  );
}

