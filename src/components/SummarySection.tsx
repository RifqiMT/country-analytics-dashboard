import type { CountryDashboardData, CountrySummary, MetricSeries } from '../types';
import { useState } from 'react';
import { formatCompactNumber, formatPercentage, formatYearRange } from '../utils/numberFormat';
import { formatGrowthChange } from '../utils/growthFormat';
import { DATA_MIN_YEAR, DATA_MAX_YEAR } from '../config';
import { getMetricIconPath } from '../icons/metricIcons';

const SvgIcon = ({ d, className }: { d: string; className?: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden className={className}>
    <path d={d} fill="currentColor" />
  </svg>
);

/** Chevron right (collapsed) and down (expanded) for expand/collapse controls */
const ChevronRight = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden className="summary-chevron summary-chevron-right">
    <path fill="currentColor" d="M6 4 5 5l4 3-4 3 1 1 5-4-5-4Z" />
  </svg>
);
const ChevronDown = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden className="summary-chevron summary-chevron-down">
    <path fill="currentColor" d="M4 6 5 5l3 3 3-3 1 1-4 4-4-4Z" />
  </svg>
);

function GeneralCard({
  summary,
  geo,
  expanded,
  onToggle,
}: {
  summary: CountrySummary;
  geo?: { landAreaKm2?: number | null; totalAreaKm2?: number | null; eezKm2?: number | null };
  expanded: boolean;
  onToggle: () => void;
}) {
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
      <button
        type="button"
        className="summary-card-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="general-card-content"
        id="general-card-toggle"
      >
        <span className="summary-card-chevron">{expanded ? <ChevronDown /> : <ChevronRight />}</span>
        <h3 className="general-card-title" id="general-card-label">General</h3>
      </button>
      <div id="general-card-content" aria-labelledby="general-card-toggle" role="region" hidden={!expanded} className="summary-card-content">
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
    </div>
  );
}

function getYoYDirection(yoy: string | null): 'up' | 'down' | 'flat' | null {
  if (!yoy) return null;
  const pctMatch = yoy.match(/^([+-]?)([\d.]+)%/);
  if (pctMatch) {
    const sign = pctMatch[1];
    if (sign === '+') return 'up';
    if (sign === '-') return 'down';
    return 'flat';
  }
  const bpsMatch = yoy.match(/^([+-]?)(\d+)\s*bps/);
  if (bpsMatch) {
    const sign = bpsMatch[1];
    const num = parseInt(bpsMatch[2], 10);
    if (sign === '+' && num > 0) return 'up';
    if (sign === '-' || num < 0) return 'down';
    return 'flat';
  }
  return null;
}

function FinancialCard({
  g,
  getYoY,
  series,
  expanded,
  onToggle,
}: {
  g: NonNullable<CountryDashboardData['latestSnapshot']>['metrics']['financial'] | undefined;
  getYoY: (s: MetricSeries[] | undefined, id: string) => string | null;
  series: MetricSeries[] | undefined;
  expanded: boolean;
  onToggle: () => void;
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
        {
          icon: 'M8 1.5a5 5 0 0 0-5 5c0 3.25 3.5 6 4.4 6.7.36.28.84.28 1.2 0C9.5 12.5 13 9.75 13 6.5a5 5 0 0 0-5-5Zm0 2.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5Z',
          label: 'Unemployment rate (% of labour force)',
          value:
            g?.unemploymentRate != null
              ? `${g.unemploymentRate.toFixed(1)}%`
              : '–',
          yoy: getYoY(series, 'unemploymentRate'),
        },
        { icon: 'M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Z', label: 'Unemployed (number)', value: formatCompactNumber(g?.unemployedTotal ?? null), yoy: getYoY(series, 'unemployedTotal') },
        { icon: 'M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Z', label: 'Labour force (total)', value: formatCompactNumber(g?.labourForceTotal ?? null), yoy: getYoY(series, 'labourForceTotal') },
      ],
    },
    {
      label: 'Poverty',
      items: [
        { icon: 'M8 2.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm0 5.5a4.25 4.25 0 0 1 4.24 3.8.75.75 0 0 1-.74.7H4.5a.75.75 0 0 1-.74-.7A4.25 4.25 0 0 1 8 7.75Z', label: 'Poverty ($2.15/day, %)', value: g?.povertyHeadcount215 != null ? `${g.povertyHeadcount215.toFixed(1)}%` : '–', yoy: getYoY(series, 'povertyHeadcount215') },
        { icon: 'M8 2.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm0 5.5a4.25 4.25 0 0 1 4.24 3.8.75.75 0 0 1-.74.7H4.5a.75.75 0 0 1-.74-.7A4.25 4.25 0 0 1 8 7.75Z', label: 'Poverty (national line, %)', value: g?.povertyHeadcountNational != null ? `${g.povertyHeadcountNational.toFixed(1)}%` : '–', yoy: getYoY(series, 'povertyHeadcountNational') },
      ],
    },
  ];

  return (
    <div className="summary-card financial-card">
      <button
        type="button"
        className="summary-card-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="financial-card-content"
        id="financial-card-toggle"
      >
        <span className="summary-card-chevron">{expanded ? <ChevronDown /> : <ChevronRight />}</span>
        <h3 className="financial-card-title" id="financial-card-label">Financial metrics</h3>
      </button>
      <div id="financial-card-content" aria-labelledby="financial-card-toggle" role="region" hidden={!expanded} className="summary-card-content">
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
    </div>
  );
}

function HealthCard({
  p,
  h,
  getYoY,
  series,
  expanded,
  onToggle,
}: {
  p: NonNullable<CountryDashboardData['latestSnapshot']>['metrics']['population'] | undefined;
  h: NonNullable<CountryDashboardData['latestSnapshot']>['metrics']['health'] | undefined;
  getYoY: (s: MetricSeries[] | undefined, id: string) => string | null;
  series: { population: MetricSeries[]; health: MetricSeries[] };
  expanded: boolean;
  onToggle: () => void;
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
        {
          icon: 'M4.75 2A1.75 1.75 0 0 0 3 3.75v8.5c0 .97.78 1.75 1.75 1.75h6.5A1.75 1.75 0 0 0 13 12.25v-8.5A1.75 1.75 0 0 0 11.25 2h-6.5Z',
          label: 'Life expectancy',
          value: h?.lifeExpectancy != null ? `${h.lifeExpectancy.toFixed(1)} years` : '–',
          yoy: getYoY(series.health, 'lifeExpectancy'),
        },
        {
          icon: 'M8 2.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm0 5.5a4.25 4.25 0 0 1 4.24 3.8.75.75 0 0 1-.74.7H4.5a.75.75 0 0 1-.74-.7A4.25 4.25 0 0 1 8 7.75Z',
          label: 'Under-5 mortality (per 1,000)',
          value:
            h?.under5MortalityRate != null
              ? `${h.under5MortalityRate.toFixed(1)}`
              : '–',
          yoy: getYoY(series.health, 'under5MortalityRate'),
        },
        {
          icon: 'M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Z',
          label: 'Maternal mortality (per 100,000)',
          value:
            h?.maternalMortalityRatio != null
              ? `${h.maternalMortalityRatio.toFixed(0)}`
              : '–',
          yoy: getYoY(series.health, 'maternalMortalityRatio'),
        },
        {
          icon: 'M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.14 4.5 7.5 4.5 7.5s4.5-4.36 4.5-7.5A4.5 4.5 0 0 0 8 1.5Zm0 6.25a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z',
          label: 'Undernourishment (% of pop.)',
          value:
            h?.undernourishmentPrevalence != null
              ? `${h.undernourishmentPrevalence.toFixed(1)}%`
              : '–',
          yoy: getYoY(series.health, 'undernourishmentPrevalence'),
        },
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
      <button
        type="button"
        className="summary-card-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="health-card-content"
        id="health-card-toggle"
      >
        <span className="summary-card-chevron">{expanded ? <ChevronDown /> : <ChevronRight />}</span>
        <h3 className="health-card-title" id="health-card-label">Health & demographics</h3>
      </button>
      <div id="health-card-content" aria-labelledby="health-card-toggle" role="region" hidden={!expanded} className="summary-card-content">
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
    </div>
  );
}

function EducationCard({
  e,
  getYoY,
  series,
  expanded,
  onToggle,
}: {
  e: NonNullable<CountryDashboardData['latestSnapshot']>['metrics']['education'] | undefined;
  getYoY: (s: MetricSeries[] | undefined, id: string) => string | null;
  series: MetricSeries[] | undefined;
  expanded: boolean;
  onToggle: () => void;
}) {
  const formatGPI = (v: number | null | undefined) =>
    v != null && Number.isFinite(v) ? (v >= 10 ? (v / 100).toFixed(2) : v.toFixed(2)) : '–';

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
      label: 'Out-of-school & completion',
      items: [
        { icon: getMetricIconPath('outOfSchoolPrimaryPct'), label: 'Out-of-school rate (primary, %)', value: e?.outOfSchoolPrimaryPct != null ? `${e.outOfSchoolPrimaryPct.toFixed(1)}%` : '–', yoy: getYoY(series, 'outOfSchoolPrimaryPct') },
        { icon: getMetricIconPath('outOfSchoolSecondaryPct'), label: 'Out-of-school rate (secondary, %)', value: e?.outOfSchoolSecondaryPct != null ? `${e.outOfSchoolSecondaryPct.toFixed(1)}%` : '–', yoy: getYoY(series, 'outOfSchoolSecondaryPct') },
        { icon: getMetricIconPath('outOfSchoolTertiaryPct'), label: 'Out-of-school rate (tertiary, %)', value: e?.outOfSchoolTertiaryPct != null ? `${e.outOfSchoolTertiaryPct.toFixed(1)}%` : '–', yoy: getYoY(series, 'outOfSchoolTertiaryPct') },
        { icon: getMetricIconPath('primaryCompletionRate'), label: 'Primary completion rate (gross, %)', value: e?.primaryCompletionRate != null ? `${e.primaryCompletionRate.toFixed(1)}%` : '–', yoy: getYoY(series, 'primaryCompletionRate') },
        { icon: getMetricIconPath('secondaryCompletionRate'), label: 'Secondary completion rate (gross, %)', value: e?.secondaryCompletionRate != null ? `${e.secondaryCompletionRate.toFixed(1)}%` : '–', yoy: getYoY(series, 'secondaryCompletionRate') },
        { icon: getMetricIconPath('tertiaryCompletionRate'), label: 'Tertiary completion rate (gross, %)', value: e?.tertiaryCompletionRate != null ? `${e.tertiaryCompletionRate.toFixed(1)}%` : '–', yoy: getYoY(series, 'tertiaryCompletionRate') },
      ],
    },
    {
      label: 'Learning & literacy',
      items: [
        { icon: getMetricIconPath('minProficiencyReadingPct'), label: 'Minimum reading proficiency (%)', value: e?.minProficiencyReadingPct != null ? `${e.minProficiencyReadingPct.toFixed(1)}%` : '–', yoy: getYoY(series, 'minProficiencyReadingPct') },
        { icon: getMetricIconPath('literacyRateAdultPct'), label: 'Adult literacy rate (%)', value: e?.literacyRateAdultPct != null ? `${e.literacyRateAdultPct.toFixed(1)}%` : '–', yoy: getYoY(series, 'literacyRateAdultPct') },
      ],
    },
    {
      label: 'Quality & investment',
      items: [
        { icon: getMetricIconPath('genderParityIndexPrimary'), label: 'Gender parity index (GPI), primary', value: formatGPI(e?.genderParityIndexPrimary), yoy: getYoY(series, 'genderParityIndexPrimary') },
        { icon: getMetricIconPath('genderParityIndexSecondary'), label: 'Gender parity index (GPI), secondary', value: formatGPI(e?.genderParityIndexSecondary), yoy: getYoY(series, 'genderParityIndexSecondary') },
        { icon: getMetricIconPath('genderParityIndexTertiary'), label: 'Gender parity index (GPI), tertiary', value: formatGPI(e?.genderParityIndexTertiary), yoy: getYoY(series, 'genderParityIndexTertiary') },
        { icon: getMetricIconPath('trainedTeachersPrimaryPct'), label: 'Trained teachers primary (%)', value: e?.trainedTeachersPrimaryPct != null ? `${e.trainedTeachersPrimaryPct.toFixed(1)}%` : '–', yoy: getYoY(series, 'trainedTeachersPrimaryPct') },
        { icon: getMetricIconPath('trainedTeachersSecondaryPct'), label: 'Trained teachers secondary (%)', value: e?.trainedTeachersSecondaryPct != null ? `${e.trainedTeachersSecondaryPct.toFixed(1)}%` : '–', yoy: getYoY(series, 'trainedTeachersSecondaryPct') },
        { icon: getMetricIconPath('trainedTeachersTertiaryPct'), label: 'Trained teachers tertiary (%)', value: e?.trainedTeachersTertiaryPct != null ? `${e.trainedTeachersTertiaryPct.toFixed(1)}%` : '–', yoy: getYoY(series, 'trainedTeachersTertiaryPct') },
        { icon: getMetricIconPath('publicExpenditureEducationPctGDP'), label: 'Public expenditure on education (% GDP)', value: e?.publicExpenditureEducationPctGDP != null ? `${e.publicExpenditureEducationPctGDP.toFixed(2)}%` : '–', yoy: getYoY(series, 'publicExpenditureEducationPctGDP') },
      ],
    },
    {
      label: 'Enrollment & staff',
      items: [
        { icon: getMetricIconPath('primaryPupilsTotal'), label: 'Primary enrollment (total)', value: e?.primaryPupilsTotal != null ? formatCompactNumber(e.primaryPupilsTotal) : '–', yoy: getYoY(series, 'primaryPupilsTotal') },
        { icon: getMetricIconPath('secondaryPupilsTotal'), label: 'Secondary enrollment (total)', value: e?.secondaryPupilsTotal != null ? formatCompactNumber(e.secondaryPupilsTotal) : '–', yoy: getYoY(series, 'secondaryPupilsTotal') },
        { icon: getMetricIconPath('tertiaryEnrollmentTotal'), label: 'Tertiary enrollment (total)', value: e?.tertiaryEnrollmentTotal != null ? formatCompactNumber(e.tertiaryEnrollmentTotal) : '–', yoy: getYoY(series, 'tertiaryEnrollmentTotal') },
        { icon: getMetricIconPath('primaryEnrollmentPct'), label: 'Primary enrollment (% gross)', value: e?.primaryEnrollmentPct != null ? `${e.primaryEnrollmentPct.toFixed(1)}%` : '–', yoy: getYoY(series, 'primaryEnrollmentPct') },
        { icon: getMetricIconPath('secondaryEnrollmentPct'), label: 'Secondary enrollment (% gross)', value: e?.secondaryEnrollmentPct != null ? `${e.secondaryEnrollmentPct.toFixed(1)}%` : '–', yoy: getYoY(series, 'secondaryEnrollmentPct') },
        { icon: getMetricIconPath('tertiaryEnrollmentPct'), label: 'Tertiary enrollment (% gross)', value: e?.tertiaryEnrollmentPct != null ? `${e.tertiaryEnrollmentPct.toFixed(1)}%` : '–', yoy: getYoY(series, 'tertiaryEnrollmentPct') },
        { icon: getMetricIconPath('primarySchoolsTotal'), label: 'Primary education, teachers (total)', value: e?.primarySchoolsTotal != null ? formatCompactNumber(e.primarySchoolsTotal) : '–', yoy: getYoY(series, 'primarySchoolsTotal') },
        { icon: getMetricIconPath('secondarySchoolsTotal'), label: 'Secondary education, teachers (total)', value: e?.secondarySchoolsTotal != null ? formatCompactNumber(e.secondarySchoolsTotal) : '–', yoy: getYoY(series, 'secondarySchoolsTotal') },
        { icon: getMetricIconPath('tertiaryInstitutionsTotal'), label: 'Tertiary education, teachers (total)', value: e?.tertiaryInstitutionsTotal != null ? formatCompactNumber(e.tertiaryInstitutionsTotal) : '–', yoy: getYoY(series, 'tertiaryInstitutionsTotal') },
      ],
    },
  ];

  return (
    <div className="summary-card education-card">
      <button
        type="button"
        className="summary-card-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="education-card-content"
        id="education-card-toggle"
      >
        <span className="summary-card-chevron">{expanded ? <ChevronDown /> : <ChevronRight />}</span>
        <h3 className="education-card-title" id="education-card-label">Education</h3>
      </button>
      <div id="education-card-content" aria-labelledby="education-card-toggle" role="region" hidden={!expanded} className="summary-card-content">
        <div className="education-groups">
        {groups.map((group) => (
          <div key={group.label} className="education-group">
            <div className="education-group-label">{group.label}</div>
            <div className="education-grid">
              {group.items.map(({ icon, label, value, yoy }) => {
                const dir = getYoYDirection(yoy);
                return (
                  <div key={label} className="education-item">
                    <div className="education-item-header">
                      <span className="education-item-icon">
                        <SvgIcon d={icon} />
                      </span>
                      <span className="education-item-label">{label}</span>
                    </div>
                    <div className="education-item-body">
                      <span className="education-item-value">{value}</span>
                      {yoy && (
                        <span className={`education-item-yoy education-item-yoy-${dir ?? 'flat'}`}>
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
    </div>
  );
}

interface Props {
  data?: CountryDashboardData;
  loading?: boolean;
  countryCode?: string;
}

export function SummarySection({ data, countryCode }: Props) {
  if (!data) {
    const noCountry = !countryCode?.trim();
    return (
      <section className="summary-section card">
        <h2 className="section-title">Global Country Snapshot</h2>
        <p className="muted">
          {noCountry
            ? 'Select a country above to view analytics and highlights from trusted sources (World Bank, WHO, UN, IMF).'
            : 'Loading country highlights from trusted sources (World Bank, WHO, UN, IMF)...'}
        </p>
      </section>
    );
  }

  const { summary, range, latestSnapshot } = data;
  const safeSummary = summary ?? { name: '–', iso2Code: '–' } as CountrySummary;
  const yearRangeLabel = formatYearRange(
    range?.startYear ?? DATA_MIN_YEAR,
    range?.endYear ?? DATA_MAX_YEAR,
  );

  const g = latestSnapshot?.metrics?.financial;
  const p = latestSnapshot?.metrics?.population;
  const h = latestSnapshot?.metrics?.health;
  const e = latestSnapshot?.metrics?.education;
  const geo = latestSnapshot?.metrics?.geography;

  const latestYear = latestSnapshot?.year;

  const getYoY = (series: MetricSeries[] | undefined, id: string): string | null => {
    if (!series || latestYear == null) return null;
    const s = series.find((m) => m.id === id);
    if (!s) return null;
    const points = s.points ?? [];
    const curr = points.find((pt) => pt.year === latestYear)?.value;
    const prev = points.find((pt) => pt.year === latestYear - 1)?.value;
    if (curr == null) return null;
    return formatGrowthChange(curr, prev ?? null, 'YoY', id);
  };

  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [generalExpanded, setGeneralExpanded] = useState(true);
  const [financialExpanded, setFinancialExpanded] = useState(true);
  const [healthExpanded, setHealthExpanded] = useState(true);
  const [educationExpanded, setEducationExpanded] = useState(true);

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
              {safeSummary.name}
              <span className="overview-code">({safeSummary.iso2Code})</span>
            </h1>
            <div className="overview-flag">
              <img
                src={`https://flagcdn.com/w80/${(safeSummary.iso2Code || 'xx').toLowerCase()}.png`}
                alt={`${safeSummary.name} flag`}
              />
            </div>
          </div>
          <div className="overview-sources">
            <span className="overview-sources-label">Data sources</span>
            <div className="overview-sources-chips">
              <span className="overview-chip">World Bank</span>
              <span className="overview-chip">UN</span>
              <span className="overview-chip">UNESCO</span>
              <span className="overview-chip">WHO</span>
              <span className="overview-chip">IMF</span>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="summary-section-toggle"
        onClick={() => setSummaryExpanded((s) => !s)}
        aria-expanded={summaryExpanded}
        aria-controls="summary-grid"
        id="summary-section-toggle"
      >
        <span className="summary-card-chevron">{summaryExpanded ? <ChevronDown /> : <ChevronRight />}</span>
        <span className="summary-section-toggle-label">Summary</span>
      </button>

      {summaryExpanded && (
      <div className="summary-grid" id="summary-grid" role="region" aria-labelledby="summary-section-toggle">
        <GeneralCard summary={safeSummary} geo={geo} expanded={generalExpanded} onToggle={() => setGeneralExpanded((g) => !g)} />
        <FinancialCard g={g} getYoY={getYoY} series={data.series?.financial ?? []} expanded={financialExpanded} onToggle={() => setFinancialExpanded((f) => !f)} />
        <HealthCard p={p} h={h} getYoY={getYoY} series={data.series ?? { financial: [], population: [], health: [] }} expanded={healthExpanded} onToggle={() => setHealthExpanded((h) => !h)} />
        <EducationCard e={e} getYoY={getYoY} series={data.series?.education ?? []} expanded={educationExpanded} onToggle={() => setEducationExpanded((e) => !e)} />
      </div>
      )}
    </section>
  );
}

