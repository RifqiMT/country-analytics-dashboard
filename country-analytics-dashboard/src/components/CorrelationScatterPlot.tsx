/**
 * Multi-metric correlation scatterplot for new market analysis.
 * Plots countries as points with selectable X/Y metrics from global data.
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

export type ScatterMetricKey = keyof Pick<
  GlobalCountryMetricsRow,
  | 'gdpNominalPerCapita'
  | 'gdpPPPPerCapita'
  | 'populationTotal'
  | 'lifeExpectancy'
  | 'inflationCPI'
  | 'govDebtPercentGDP'
  | 'unemploymentRate'
  | 'povertyHeadcount215'
  | 'povertyHeadcountNational'
  | 'pop0_14Pct'
  | 'pop15_64Pct'
  | 'pop65PlusPct'
  | 'landAreaKm2'
  | 'eezKm2'
>;

export const SCATTER_METRIC_OPTIONS: { key: ScatterMetricKey; label: string }[] = [
  { key: 'gdpNominalPerCapita', label: 'GDP per capita (Nominal, US$)' },
  { key: 'gdpPPPPerCapita', label: 'GDP per capita (PPP, Intl$)' },
  { key: 'populationTotal', label: 'Population, total' },
  { key: 'lifeExpectancy', label: 'Life expectancy (years)' },
  { key: 'inflationCPI', label: 'Inflation (CPI, %)' },
  { key: 'govDebtPercentGDP', label: 'Government debt (% of GDP)' },
  { key: 'unemploymentRate', label: 'Unemployment rate (% of labour force)' },
  { key: 'povertyHeadcount215', label: 'Poverty ($2.15/day, %)' },
  { key: 'povertyHeadcountNational', label: 'Poverty (national line, %)' },
  { key: 'pop0_14Pct', label: 'Population 0–14 (%)' },
  { key: 'pop15_64Pct', label: 'Population 15–64 (%)' },
  { key: 'pop65PlusPct', label: 'Population 65+ (%)' },
  { key: 'landAreaKm2', label: 'Land area (km²)' },
  { key: 'eezKm2', label: 'EEZ (km²)' },
];

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
  if (key === 'populationTotal' || key === 'landAreaKm2' || key === 'eezKm2') {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  }
  if (key === 'gdpNominalPerCapita' || key === 'gdpPPPPerCapita') {
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  }
  if (
    key === 'inflationCPI' ||
    key === 'govDebtPercentGDP' ||
    key === 'unemploymentRate' ||
    key === 'povertyHeadcount215' ||
    key === 'povertyHeadcountNational' ||
    key === 'pop0_14Pct' ||
    key === 'pop15_64Pct' ||
    key === 'pop65PlusPct'
  ) {
    return value.toFixed(0);
  }
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
    xMetric === 'landAreaKm2' ||
    xMetric === 'eezKm2' ||
    xMetric === 'gdpNominalPerCapita' ||
    xMetric === 'gdpPPPPerCapita';
  const useLogY =
    yMetric === 'populationTotal' ||
    yMetric === 'landAreaKm2' ||
    yMetric === 'eezKm2' ||
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
