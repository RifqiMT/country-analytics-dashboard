/**
 * Multi-metric correlation scatterplot for new market analysis.
 * Plots countries as points with selectable X/Y metrics from global data.
 * All numeric metrics are included and grouped by category.
 */
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { GlobalCountryMetricsRow } from '../types';

/** All numeric metric keys available in GlobalCountryMetricsRow for scatter axes */
export type ScatterMetricKey = keyof Pick<
  GlobalCountryMetricsRow,
  | 'gdpNominal'
  | 'gdpPPP'
  | 'gdpNominalPerCapita'
  | 'gdpPPPPerCapita'
  | 'inflationCPI'
  | 'govDebtPercentGDP'
  | 'govDebtUSD'
  | 'interestRate'
  | 'unemploymentRate'
  | 'unemployedTotal'
  | 'labourForceTotal'
  | 'povertyHeadcount215'
  | 'povertyHeadcountNational'
  | 'populationTotal'
  | 'population0_14'
  | 'population15_64'
  | 'population65Plus'
  | 'pop0_14Pct'
  | 'pop15_64Pct'
  | 'pop65PlusPct'
  | 'lifeExpectancy'
  | 'maternalMortalityRatio'
  | 'under5MortalityRate'
  | 'undernourishmentPrevalence'
  | 'landAreaKm2'
  | 'totalAreaKm2'
  | 'eezKm2'
>;

export interface ScatterMetricOption {
  key: ScatterMetricKey;
  label: string;
}

/** Grouped options for X/Y dropdowns (optgroup). Order defines display order. */
export const SCATTER_METRIC_OPTIONS_GROUPED: { group: string; options: ScatterMetricOption[] }[] = [
  {
    group: 'Financial – GDP',
    options: [
      { key: 'gdpNominal', label: 'GDP (Nominal, US$)' },
      { key: 'gdpPPP', label: 'GDP (PPP, Intl$)' },
      { key: 'gdpNominalPerCapita', label: 'GDP per capita (Nominal, US$)' },
      { key: 'gdpPPPPerCapita', label: 'GDP per capita (PPP, Intl$)' },
    ],
  },
  {
    group: 'Financial – Debt & rates',
    options: [
      { key: 'govDebtPercentGDP', label: 'Government debt (% of GDP)' },
      { key: 'govDebtUSD', label: 'Government debt (USD)' },
      { key: 'interestRate', label: 'Lending interest rate (%)' },
      { key: 'inflationCPI', label: 'Inflation (CPI, %)' },
    ],
  },
  {
    group: 'Financial – Labour & poverty',
    options: [
      { key: 'unemploymentRate', label: 'Unemployment rate (% of labour force)' },
      { key: 'unemployedTotal', label: 'Unemployed (number)' },
      { key: 'labourForceTotal', label: 'Labour force (total)' },
      { key: 'povertyHeadcount215', label: 'Poverty ($2.15/day, %)' },
      { key: 'povertyHeadcountNational', label: 'Poverty (national line, %)' },
    ],
  },
  {
    group: 'Population',
    options: [
      { key: 'populationTotal', label: 'Population, total' },
      { key: 'pop0_14Pct', label: 'Population 0–14 (%)' },
      { key: 'pop15_64Pct', label: 'Population 15–64 (%)' },
      { key: 'pop65PlusPct', label: 'Population 65+ (%)' },
      { key: 'population0_14', label: 'Population 0–14 (count)' },
      { key: 'population15_64', label: 'Population 15–64 (count)' },
      { key: 'population65Plus', label: 'Population 65+ (count)' },
    ],
  },
  {
    group: 'Health',
    options: [
      { key: 'lifeExpectancy', label: 'Life expectancy (years)' },
      { key: 'maternalMortalityRatio', label: 'Maternal mortality (per 100k)' },
      { key: 'under5MortalityRate', label: 'Under-5 mortality (per 1k)' },
      { key: 'undernourishmentPrevalence', label: 'Undernourishment (% of pop.)' },
    ],
  },
  {
    group: 'Geography',
    options: [
      { key: 'landAreaKm2', label: 'Land area (km²)' },
      { key: 'totalAreaKm2', label: 'Total area (km²)' },
      { key: 'eezKm2', label: 'EEZ (km²)' },
    ],
  },
];

/** Flat list of all options (for backward compatibility and lookups) */
export const SCATTER_METRIC_OPTIONS: ScatterMetricOption[] =
  SCATTER_METRIC_OPTIONS_GROUPED.flatMap((g) => g.options);

interface CorrelationScatterPlotProps {
  data: GlobalCountryMetricsRow[];
  xMetric: ScatterMetricKey;
  yMetric: ScatterMetricKey;
  highlightCountryIso2?: string | null;
  year: number;
}

function getValue(row: GlobalCountryMetricsRow, key: ScatterMetricKey): number | null {
  const v = row[key];
  if (v == null || typeof v !== 'number' || Number.isNaN(v)) return null;
  return v;
}

function formatAxisValue(value: number, key: ScatterMetricKey): string {
  const compactKeys: ScatterMetricKey[] = [
    'populationTotal',
    'unemployedTotal',
    'labourForceTotal',
    'population0_14',
    'population15_64',
    'population65Plus',
    'landAreaKm2',
    'totalAreaKm2',
    'eezKm2',
    'gdpNominal',
    'gdpPPP',
    'govDebtUSD',
  ];
  if (compactKeys.includes(key)) {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  }
  if (key === 'gdpNominalPerCapita' || key === 'gdpPPPPerCapita') {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  }
  const pctKeys: ScatterMetricKey[] = [
    'inflationCPI',
    'govDebtPercentGDP',
    'interestRate',
    'unemploymentRate',
    'povertyHeadcount215',
    'povertyHeadcountNational',
    'pop0_14Pct',
    'pop15_64Pct',
    'pop65PlusPct',
    'undernourishmentPrevalence',
  ];
  if (pctKeys.includes(key)) return value.toFixed(0);
  if (key === 'lifeExpectancy') return value.toFixed(1);
  if (key === 'maternalMortalityRatio' || key === 'under5MortalityRate') return value.toFixed(0);
  return value.toFixed(1);
}

export function CorrelationScatterPlot({
  data,
  xMetric,
  yMetric,
  highlightCountryIso2,
  year,
}: CorrelationScatterPlotProps) {
  const xLabel = SCATTER_METRIC_OPTIONS.find((o) => o.key === xMetric)?.label ?? xMetric;
  const yLabel = SCATTER_METRIC_OPTIONS.find((o) => o.key === yMetric)?.label ?? yMetric;

  const plotData = data
    .map((row) => {
      const x = getValue(row, xMetric);
      const y = getValue(row, yMetric);
      if (x == null || y == null) return null;
      const isHighlight = highlightCountryIso2
        ? row.iso2Code?.toUpperCase() === highlightCountryIso2.toUpperCase()
        : false;
      return {
        name: row.name,
        iso2: row.iso2Code,
        x,
        y,
        isHighlight,
        xFormatted: formatAxisValue(x, xMetric),
        yFormatted: formatAxisValue(y, yMetric),
      };
    })
    .filter((d): d is NonNullable<typeof d> => d != null);

  const highlightPoints = plotData.filter((d) => d.isHighlight);
  const otherPoints = plotData.filter((d) => !d.isHighlight);

  const useLogX =
    xMetric === 'populationTotal' ||
    xMetric === 'population0_14' ||
    xMetric === 'population15_64' ||
    xMetric === 'population65Plus' ||
    xMetric === 'landAreaKm2' ||
    xMetric === 'totalAreaKm2' ||
    xMetric === 'eezKm2' ||
    xMetric === 'gdpNominal' ||
    xMetric === 'gdpPPP' ||
    xMetric === 'govDebtUSD' ||
    xMetric === 'gdpNominalPerCapita' ||
    xMetric === 'gdpPPPPerCapita';
  const useLogY =
    yMetric === 'populationTotal' ||
    yMetric === 'population0_14' ||
    yMetric === 'population15_64' ||
    yMetric === 'population65Plus' ||
    yMetric === 'landAreaKm2' ||
    yMetric === 'totalAreaKm2' ||
    yMetric === 'eezKm2' ||
    yMetric === 'gdpNominal' ||
    yMetric === 'gdpPPP' ||
    yMetric === 'govDebtUSD' ||
    yMetric === 'gdpNominalPerCapita' ||
    yMetric === 'gdpPPPPerCapita';

  if (plotData.length === 0) {
    return (
      <div className="correlation-scatter-empty">
        <p className="muted">No data available for the selected metrics in {year}.</p>
      </div>
    );
  }

  return (
    <div className="correlation-scatter-wrap">
      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            scale={useLogX ? 'log' : 'linear'}
            domain={useLogX ? ['auto', 'auto'] : undefined}
            tickFormatter={(v) => formatAxisValue(v, xMetric)}
            stroke="var(--text-muted)"
            fontSize={11}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            scale={useLogY ? 'log' : 'linear'}
            domain={useLogY ? ['auto', 'auto'] : undefined}
            tickFormatter={(v) => formatAxisValue(v, yMetric)}
            stroke="var(--text-muted)"
            fontSize={11}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <div className="correlation-scatter-tooltip">
                  <strong>{p.name}</strong>
                  <div>
                    {xLabel}: {p.xFormatted}
                  </div>
                  <div>
                    {yLabel}: {p.yFormatted}
                  </div>
                </div>
              );
            }}
          />
          {otherPoints.length > 0 && (
            <Scatter
              name="Countries"
              data={otherPoints}
              fill="var(--accent-red)"
              fillOpacity={0.5}
              stroke="var(--accent-red)"
              strokeWidth={1}
            />
          )}
          {highlightPoints.length > 0 && (
            <Scatter
              name={highlightCountryIso2 ? 'Selected country' : 'Highlighted'}
              data={highlightPoints}
              fill="var(--accent-gold)"
              fillOpacity={1}
              stroke="var(--accent-red)"
              strokeWidth={2}
            />
          )}
          <Legend />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
