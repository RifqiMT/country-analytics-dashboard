import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type {
  CountryDashboardData,
  Frequency,
  MetricId,
  MetricSeries,
} from '../types';
import { formatCompactNumber } from '../utils/numberFormat';
interface Props {
  data?: CountryDashboardData;
  frequency: Frequency;
  setFrequency: (f: Frequency) => void;
  selectedMetricIds: MetricId[];
  setSelectedMetricIds: (ids: MetricId[]) => void;
  resampledSeries?: CountryDashboardData['series'];
}

const METRIC_COLORS: Record<MetricId, string> = {
  gdpNominal: '#c8102e', // Indonesian red
  gdpPPP: '#b45309', // deep gold / brown
  gdpNominalPerCapita: '#f59e0b', // amber
  gdpPPPPerCapita: '#eab308', // bright gold
  inflationCPI: '#f97316', // orange for inflation
  govDebtPercentGDP: '#7f1d1d', // dark red for debt
  govDebtUSD: '#991b1b', // darker red for debt USD
  interestRate: '#0369a1', // blue for interest rate
  unemploymentRate: '#22c55e', // green for unemployment
  povertyHeadcount215: '#dc2626', // red for poverty
  povertyHeadcountNational: '#b91c1c', // dark red for poverty
  populationTotal: '#111827', // near-black for population
  lifeExpectancy: '#0f766e', // teal for health
  maternalMortalityRatio: '#b91c1c', // dark red for maternal mortality
  under5MortalityRate: '#fb923c', // orange for child mortality
  undernourishmentPrevalence: '#16a34a', // green for malnutrition
  pop0_14Share: '#2563eb', // blue for young population share
  pop15_64Share: '#7c3aed', // violet for working-age share
  pop65PlusShare: '#be123c', // deep rose for senior share
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly (interpolated)',
  monthly: 'Monthly (interpolated)',
  quarterly: 'Quarterly (interpolated)',
  yearly: 'Annual (observed)',
};

export function TimeSeriesSection({
  data,
  frequency,
  setFrequency,
  selectedMetricIds,
  setSelectedMetricIds,
  resampledSeries,
}: Props) {
  const finalSeries = resampledSeries ?? data?.series;

  if (!data || !finalSeries) {
    return (
      <section className="card">
        <h2 className="section-title">Financial & population trends</h2>
        <p className="muted">Loading time-series data...</p>
      </section>
    );
  }

  const allSeries: MetricSeries[] = [
    ...finalSeries.financial,
    ...finalSeries.population,
    ...finalSeries.health.filter(
      (s) =>
        s.id !== 'pop0_14Share' &&
        s.id !== 'pop15_64Share' &&
        s.id !== 'pop65PlusShare',
    ),
  ].filter(
    (s) =>
      s.id !== 'inflationCPI' &&
      s.id !== 'govDebtPercentGDP' &&
      s.id !== 'interestRate' &&
      s.id !== 'unemploymentRate' &&
      s.id !== 'povertyHeadcount215' &&
      s.id !== 'povertyHeadcountNational' &&
      s.id !== 'maternalMortalityRatio' &&
      s.id !== 'under5MortalityRate' &&
      s.id !== 'undernourishmentPrevalence',
  );

  const labelByMetricId = allSeries.reduce<Record<MetricId, string>>(
    (acc, series) => {
      acc[series.id] = series.label;
      return acc;
    },
    {} as Record<MetricId, string>,
  );

  const baseData = allSeries[0]?.points ?? [];
  const merged = baseData.map((p) => {
    const row: any = { date: p.date, year: p.year };
    for (const metricId of selectedMetricIds) {
      const seriesForMetric = allSeries.find((s) => s.id === metricId);
      const value = seriesForMetric?.points.find(
        (sp) => sp.date === p.date,
      )?.value;
      row[metricId] = value ?? null;
    }
    return row;
  });

  const availableMetricIds = allSeries.map((s) => s.id);

  const xKey = frequency === 'yearly' ? 'year' : 'date';

  const formatAxisLabel = (value: string | number) => {
    if (frequency === 'yearly') return String(value);
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    if (frequency === 'monthly') {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }); // e.g. Jan 2024
    }
    if (frequency === 'quarterly') {
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      return `Q${quarter} ${d.getFullYear()}`; // e.g. Q1 2024
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    }); // e.g. Mar 05, 24
  };

  const rawTicks =
    frequency === 'yearly'
      ? baseData.map((p) => p.year)
      : baseData.map((p) => p.date);

  const step =
    rawTicks.length <= 6 ? 1 : Math.max(1, Math.floor(rawTicks.length / 6));

  const xTicks = rawTicks.filter((_, index) => index % step === 0);

  const unitByMetricId = allSeries.reduce<Record<MetricId, string>>(
    (acc, s) => {
      acc[s.id] = s.unit;
      return acc;
    },
    {} as Record<MetricId, string>,
  );

  const formatTooltipValue = (metricId: MetricId, value: number): string => {
    if (metricId === 'lifeExpectancy') {
      return `${value.toFixed(1)} years`;
    }
    return formatCompactNumber(value);
  };

  const CustomTooltip = (props: {
    active?: boolean;
    payload?: Array<{ dataKey?: string; value?: number; name?: string; color?: string }>;
    label?: string | number;
  }) => {
    const { active, payload, label } = props;
    if (!active || !payload || !payload.length || label == null) {
      return null;
    }

    const byMetricId = new Map<
      string,
      { name: string; value: number; color: string; change?: string; changeDirection?: 'up' | 'down' | 'flat'; unit?: string }
    >();

    const index = merged.findIndex(
      (row) => String(row[xKey]) === String(label),
    );
    const prevRow = index > 0 ? merged[index - 1] : undefined;

    const freqLabel: Record<Frequency, string> = {
      weekly: 'WoW',
      monthly: 'MoM',
      quarterly: 'QoQ',
      yearly: 'YoY',
    };
    payload.forEach((p) => {
      if (p.value == null || p.dataKey == null) return;
      const id = String(p.dataKey);
      const current = p.value as number;
      const prev =
        prevRow && prevRow[id] != null
          ? (prevRow[id] as number)
          : null;

      let change: string | undefined;
      let changeDirection: 'up' | 'down' | 'flat' | undefined;
      if (prev != null && prev !== 0) {
        const pct = ((current - prev) / Math.abs(prev)) * 100;
        const rounded = Number.isFinite(pct) ? pct : 0;
        if (rounded > 0.05) {
          changeDirection = 'up';
        } else if (rounded < -0.05) {
          changeDirection = 'down';
        } else {
          changeDirection = 'flat';
        }
        change = `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}% ${freqLabel[frequency]}`;
      }

      byMetricId.set(id, {
        name: labelByMetricId[id as MetricId] ?? String(p.name),
        value: current,
        color: p.color ?? '#6b7280',
        change,
        changeDirection,
        unit: unitByMetricId[id as MetricId],
      });
    });

    const METRIC_DISPLAY_ORDER: MetricId[] = [
      'gdpNominal',
      'gdpPPP',
      'gdpNominalPerCapita',
      'gdpPPPPerCapita',
      'govDebtUSD',
      'populationTotal',
      'lifeExpectancy',
    ];

    const rows = METRIC_DISPLAY_ORDER
      .filter((id) => selectedMetricIds.includes(id) && byMetricId.has(id))
      .map((id) => {
        const r = byMetricId.get(id)!;
        return { ...r, metricId: id };
      })
      .filter((r) => !!r && r.value != null);

    if (!rows.length) return null;

    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-title">
          {frequency === 'yearly'
            ? `Year ${label}`
            : String(formatAxisLabel(label as string | number))}
        </div>
        <div className="chart-tooltip-body">
          {rows.map((row) => (
            <div key={row.metricId} className="chart-tooltip-row">
              <span
                className="chart-tooltip-dot"
                style={{ backgroundColor: row.color }}
              />
              <div className="chart-tooltip-label">{row.name}</div>
              <div className="chart-tooltip-value">
                {formatTooltipValue(row.metricId, row.value)}
                {row.unit && row.metricId !== 'lifeExpectancy' && (
                  <span className="chart-tooltip-unit"> {row.unit}</span>
                )}
              </div>
              {row.change && (
                <div
                  className={`chart-tooltip-change ${
                    row.changeDirection === 'up'
                      ? 'chart-tooltip-change-up'
                      : row.changeDirection === 'down'
                        ? 'chart-tooltip-change-down'
                        : 'chart-tooltip-change-flat'
                  }`}
                >
                  {row.change}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="card timeseries-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Unified financial & population timeline</h2>
          <p className="muted">
            Switch between weekly, monthly, quarterly, and annual views. Sub-annual views are smoothly
            interpolated from annual observations.
          </p>
        </div>
        <div className="pill-group">
          {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`pill ${frequency === f ? 'pill-active' : ''}`}
              onClick={() => {
                setFrequency(f);
              }}
            >
              <span className="icon-12">
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  {f === 'yearly' && (
                    <path d="M5 1.75a.75.75 0 0 1 .75.75V3h4.5V2.5a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v7.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-7.5A1.75 1.75 0 0 1 3.75 3h.5V2.5A.75.75 0 0 1 5 1.75ZM4 6.5a.5.5 0 0 0-.5.5v5.25c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V7a.5.5 0 0 0-.5-.5H4Z" />
                  )}
                  {f === 'quarterly' && (
                    <path d="M3.25 3A.75.75 0 0 1 4 2.25h8A.75.75 0 0 1 12.75 3v10a.75.75 0 0 1-1.2.6L8 11.5l-3.55 2.1A.75.75 0 0 1 3.25 13V3Zm1.5.75v7.53L8 9.92l3.25 1.36V3.75h-6.5Z" />
                  )}
                  {f === 'monthly' && (
                    <path d="M4 2.75A1.75 1.75 0 0 1 5.75 1h4.5A1.75 1.75 0 0 1 12 2.75V13a.75.75 0 0 1-1.2.6L8 11.25l-2.8 2.35A.75.75 0 0 1 4 13V2.75Zm1.5 0v8.03l2-1.68 2 1.68V2.75a.25.25 0 0 0-.25-.25h-3.5a.25.25 0 0 0-.25.25Z" />
                  )}
                  {f === 'weekly' && (
                    <path d="M3.25 4A.75.75 0 0 1 4 3.25h8A.75.75 0 0 1 12.75 4v1.5A2.75 2.75 0 0 1 10 8.25H9.06l1.72 2.22a.75.75 0 1 1-1.2.9L7.5 9.25 5.92 11.4a.75.75 0 1 1-1.2-.9L6.44 8.25H6A2.75 2.75 0 0 1 3.25 5.5V4Zm1.5.75V5.5c0 .69.56 1.25 1.25 1.25h4A1.25 1.25 0 0 0 11.25 5.5V4.75h-6.5Z" />
                  )}
                </svg>
              </span>
              <span>{FREQUENCY_LABELS[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="metric-toggle-row">
        {availableMetricIds.map((id) => (
          <button
            key={id}
            type="button"
            className={`tag ${selectedMetricIds.includes(id) ? 'tag-active' : ''}`}
            onClick={() => {
              if (selectedMetricIds.includes(id)) {
                setSelectedMetricIds(selectedMetricIds.filter((m) => m !== id));
              } else {
                setSelectedMetricIds([...selectedMetricIds, id]);
              }
            }}
          >
            <span
              className="tag-swatch"
              style={{ backgroundColor: METRIC_COLORS[id] }}
            />
            {allSeries.find((s) => s.id === id)?.label ?? id}
          </button>
        ))}
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={merged}
            margin={{ top: 12, right: 24, bottom: 24, left: 8 }}
          >
            <CartesianGrid
              stroke="rgba(148,163,184,0.25)"
              vertical={false}
            />
            <XAxis
              dataKey={xKey}
              ticks={xTicks}
              tickFormatter={formatAxisLabel}
              tickLine={false}
              tickMargin={8}
              stroke="rgba(148,163,184,0.9)"
              tick={{
                fontSize: 10,
                fill: 'rgba(55,65,81,0.9)',
              }}
            />
            <YAxis
              tickFormatter={(v) => formatCompactNumber(v as number)}
              tickLine={false}
              tickMargin={8}
              stroke="rgba(148,163,184,0.9)"
            />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid rgba(148,163,184,0.6)',
                borderRadius: 8,
                boxShadow: '0 10px 30px rgba(15,23,42,0.16)',
              }}
              content={<CustomTooltip />}
            />
            {selectedMetricIds.map((metricId) => (
              <Line
                key={metricId}
                type="monotone"
                dataKey={metricId}
                stroke={METRIC_COLORS[metricId]}
                strokeWidth={2}
                dot={false}
                hide={!merged.some((row) => row[metricId] != null)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend-row">
        {selectedMetricIds.map((metricId) => (
          <div key={metricId} className="chart-legend-item">
            <span
              className="chart-legend-swatch"
              style={{ backgroundColor: METRIC_COLORS[metricId] }}
            />
            <span className="chart-legend-label">
              {labelByMetricId[metricId] ?? metricId}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

