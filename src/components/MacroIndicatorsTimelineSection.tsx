import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useState } from 'react';
import type {
  CountryDashboardData,
  Frequency,
  MetricId,
  MetricSeries,
} from '../types';
import { formatCompactNumber } from '../utils/numberFormat';
import type { TooltipProps } from 'recharts';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';

const ECONOMIC_METRIC_IDS: MetricId[] = [
  'inflationCPI',
  'govDebtPercentGDP',
  'interestRate',
  'unemploymentRate',
  'povertyHeadcount215',
  'povertyHeadcountNational',
];

const HEALTH_METRIC_IDS: MetricId[] = [
  'maternalMortalityRatio',
  'under5MortalityRate',
  'undernourishmentPrevalence',
  'lifeExpectancy',
];

const RIGHT_AXIS_METRICS: MetricId[] = HEALTH_METRIC_IDS;

const METRIC_COLORS: Record<string, string> = {
  inflationCPI: '#f97316',
  govDebtPercentGDP: '#7f1d1d',
  interestRate: '#0369a1',
  unemploymentRate: '#22c55e',
  povertyHeadcount215: '#dc2626',
  povertyHeadcountNational: '#b91c1c',
  maternalMortalityRatio: '#b91c1c',
  under5MortalityRate: '#fb923c',
  undernourishmentPrevalence: '#16a34a',
  lifeExpectancy: '#0f766e',
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly (interpolated)',
  monthly: 'Monthly (interpolated)',
  quarterly: 'Quarterly (interpolated)',
  yearly: 'Annual (observed)',
};

type MacroVariant = 'economic' | 'health';

interface Props {
  data?: CountryDashboardData;
  frequency: Frequency;
  setFrequency: (f: Frequency) => void;
  resampledSeries?: CountryDashboardData['series'];
  variant: MacroVariant;
}

export function MacroIndicatorsTimelineSection({
  data,
  frequency,
  setFrequency,
  resampledSeries,
  variant,
}: Props) {
  const isHealth = variant === 'health';
  const ACTIVE_METRIC_IDS = isHealth ? HEALTH_METRIC_IDS : ECONOMIC_METRIC_IDS;

  const finalSeries = resampledSeries ?? data?.series;
  const [selectedMetricIds, setSelectedMetricIds] = useState<MetricId[]>(ACTIVE_METRIC_IDS);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [isFrequencyOpen, setIsFrequencyOpen] = useState(false);

  if (!data || !finalSeries) {
    return (
      <section className="card">
        <h2 className="section-title">Inflation, debt, unemployment, poverty & interest</h2>
        <p className="muted">Loading time-series data...</p>
      </section>
    );
  }

  const allSeries: MetricSeries[] = [
    ...(finalSeries.financial ?? []),
    ...(finalSeries.population ?? []),
    ...(finalSeries.health ?? []),
  ].filter((s) => ACTIVE_METRIC_IDS.includes(s.id));

  const displayStartYear =
    data.range
      ? Math.max(data.range.startYear, DATA_MIN_YEAR)
      : DATA_MIN_YEAR;
  const displayEndYear =
    data.range
      ? Math.min(data.range.endYear, DATA_MAX_YEAR)
      : DATA_MAX_YEAR;

  const labelByMetricId = allSeries.reduce<Record<string, string>>(
    (acc, series) => {
      acc[series.id] = series.label;
      return acc;
    },
    {},
  );

  // Use union of all dates from all three metrics so each series can show its full range (WB + IMF fallback).
  const dateSet = new Map<string, number>();
  for (const s of allSeries) {
    const points = s.points ?? [];
    for (const p of points) {
      if (p.year < displayStartYear || p.year > displayEndYear) continue;
      dateSet.set(p.date, p.year);
    }
  }
  const sortedDates = [...dateSet.entries()].sort(
    (a, b) => a[1] !== b[1] ? a[1] - b[1] : a[0].localeCompare(b[0]),
  );
  const baseData = sortedDates.map(([date, year]) => ({ date, year }));

  const seriesById = new Map<string, MetricSeries>();
  for (const s of allSeries) {
    seriesById.set(s.id, s);
  }

  const forwardFilledCache = new Map<string, Map<string, number | null>>();

  const freqLabel: Record<Frequency, string> = {
    weekly: 'WoW',
    monthly: 'MoM',
    quarterly: 'QoQ',
    yearly: 'YoY',
  };

  const getMetricValueAtDate = (metricId: MetricId, date: string): number | null => {
    const seriesForMetric = seriesById.get(metricId);
    if (!seriesForMetric) return null;

    if (metricId !== 'lifeExpectancy') {
      return (
        seriesForMetric.points?.find((sp) => sp.date === date)?.value ?? null
      );
    }

    let filled = forwardFilledCache.get(metricId);
    if (!filled) {
      filled = new Map<string, number | null>();
      let last: number | null = null;
      for (const p of baseData) {
        const v =
          seriesForMetric.points?.find((sp) => sp.date === p.date)?.value ?? null;
        if (v != null) last = v;
        filled.set(p.date, last);
      }
      forwardFilledCache.set(metricId, filled);
    }
    return filled.get(date) ?? null;
  };

  const merged = baseData.map((p) => {
    const row: Record<string, string | number | null> = {
      date: p.date,
      year: p.year,
    };
    for (const metricId of ACTIVE_METRIC_IDS) {
      row[metricId] = getMetricValueAtDate(metricId, p.date);
    }
    return row;
  });

  const xKey = frequency === 'yearly' ? 'year' : 'date';

  const formatAxisLabel = (value: string | number) => {
    if (frequency === 'yearly') return String(value);
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    if (frequency === 'monthly') {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    }
    if (frequency === 'quarterly') {
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      return `Q${quarter} ${d.getFullYear()}`;
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  };

  const rawTicks =
    frequency === 'yearly'
      ? baseData.map((p) => p.year)
      : baseData.map((p) => p.date);
  const step =
    rawTicks.length <= 6 ? 1 : Math.max(1, Math.floor(rawTicks.length / 6));
  const xTicks = rawTicks.filter((_, index) => index % step === 0);

  const CustomTooltip = ({
    active,
    label,
    payload,
  }: TooltipProps<number, string> & {
    active?: boolean;
    label?: string;
    payload?: Array<{ dataKey?: string; value?: number; color?: string; name?: string }>;
  }) => {
    if (!active || !payload || !payload.length) return null;

    const byMetricId = new Map<
      string,
      {
        name: string;
        value: number;
        color: string;
        change?: string;
        changeDirection?: 'up' | 'down' | 'flat';
      }
    >();
    const index = merged.findIndex((row) => row[xKey] === label);
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
        prevRow && prevRow[id] != null ? (prevRow[id] as number) : null;

      let change: string | undefined;
      let changeDirection: 'up' | 'down' | 'flat' | undefined;
      if (prev != null && prev !== 0) {
        const pct = ((current - prev) / Math.abs(prev)) * 100;
        const rounded = Number.isFinite(pct) ? pct : 0;
        if (rounded > 0.05) changeDirection = 'up';
        else if (rounded < -0.05) changeDirection = 'down';
        else changeDirection = 'flat';
        change = `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}% ${freqLabel[frequency]}`;
      }

      byMetricId.set(id, {
        name: labelByMetricId[id] ?? String(p.name),
        value: current,
        color: p.color ?? '#6b7280',
        change,
        changeDirection,
      });
    });

    const rows = ACTIVE_METRIC_IDS
      .filter((id) => selectedMetricIds.includes(id) && byMetricId.has(id))
      .map((id) => byMetricId.get(id)!)
      .filter(Boolean);

    if (!rows.length) return null;

    // Show a single flat group of metrics in the tooltip (no category labels)
    const rowsByCategory = [
      {
        label: '',
        rows: ACTIVE_METRIC_IDS.filter((id) => selectedMetricIds.includes(id))
          .map((id) => byMetricId.get(id))
          .filter((r): r is NonNullable<typeof r> => r != null),
      },
    ].filter((g) => g.rows.length > 0);

    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-title">
          {frequency === 'yearly'
            ? `Year ${label}`
            : String(formatAxisLabel(label as string | number))}
        </div>
        <div className="chart-tooltip-body">
          {rowsByCategory.map((group) => (
            <div key={group.label || 'metrics'} className="chart-tooltip-category">
              {group.label ? (
                <div className="chart-tooltip-category-label">{group.label}</div>
              ) : null}
              {group.rows.map((row) => (
                <div key={row.name} className="chart-tooltip-row">
                  <span
                    className="chart-tooltip-dot"
                    style={{ backgroundColor: row.color }}
                  />
                  <div className="chart-tooltip-label">{row.name}</div>
                  <div className="chart-tooltip-value">
                    {row.name.toLowerCase().includes('life expectancy')
                      ? `${row.value.toFixed(1)}`
                      : formatCompactNumber(row.value)}
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
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="card timeseries-section dashboard-grid-full">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            {isHealth
              ? 'Macro indicators timeline – health'
              : 'Macro indicators timeline – economic & financial'}
          </h2>
          {isHealth ? (
            <p className="muted">
              Switch between weekly, monthly, quarterly, and annual views. Sub-annual views are smoothly
              interpolated from annual observations. Includes maternal mortality, under-5 mortality,
              undernourishment prevalence, and life expectancy.
            </p>
          ) : (
            <p className="muted">
              Switch between weekly, monthly, quarterly, and annual views. Sub-annual views are smoothly
              interpolated from annual observations. Includes inflation, government debt, lending rate,
              unemployment rate, and poverty metrics. Unemployed (number) and labour force (total) are in a
              separate chart below.
            </p>
          )}
        </div>
        <div className="section-header-controls">
          <div className="section-header-control-group">
            <div className="section-control-label">Frequency</div>
            <div
              className="frequency-toolbar"
              tabIndex={-1}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setIsFrequencyOpen(false);
                }
              }}
            >
              <button
                type="button"
                className="map-metric-trigger"
                aria-haspopup="listbox"
                aria-expanded={isFrequencyOpen}
                onClick={() => setIsFrequencyOpen((open) => !open)}
              >
                <span className="map-metric-trigger-icon">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M5 1.5a.75.75 0 0 1 .75.75V3h4.5V2.25a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v8.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-8.5A1.75 1.75 0 0 1 3.75 3h.5V2.25A.75.75 0 0 1 5 1.5Zm7 5H4a.5.5 0 0 0-.5.5v6.25c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V7a.5.5 0 0 0-.5-.5Z" />
                  </svg>
                </span>
                <span className="map-metric-trigger-label">
                  {FREQUENCY_LABELS[frequency]}
                </span>
                <span
                  className={`map-metric-trigger-chevron ${isFrequencyOpen ? 'open' : ''}`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.53a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </span>
              </button>
              {isFrequencyOpen && (
                <div className="map-metric-dropdown" role="listbox">
                  <div className="map-metric-category">
                    <div className="map-metric-category-header">
                      <span className="map-metric-category-icon">
                        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-6.5Z" />
                        </svg>
                      </span>
                      <span>Sampling cadence</span>
                    </div>
                    <div className="map-metric-category-items">
                      {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={`map-metric-option ${frequency === f ? 'selected' : ''}`}
                          onClick={() => {
                            setFrequency(f);
                            setIsFrequencyOpen(false);
                          }}
                        >
                          <span className="map-metric-option-icon">
                            {frequency === f && (
                              <svg
                                viewBox="0 0 16 16"
                                aria-hidden="true"
                                focusable="false"
                              >
                                <path d="M6.5 10.293 4.354 8.146a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l5-5a.5.5 0 0 0-.708-.708L6.5 10.293Z" />
                              </svg>
                            )}
                          </span>
                          <span>{FREQUENCY_LABELS[f]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="section-header-control-group">
            <div className="section-control-label">View</div>
            <div className="pill-group pill-group-secondary">
            <button
              type="button"
              className={`pill ${viewMode === 'chart' ? 'pill-active' : ''}`}
              onClick={() => setViewMode('chart')}
            >
              <span className="icon-12">
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="M2.75 3A.75.75 0 0 0 2 3.75v8.5c0 .414.336.75.75.75h11.5a.75.75 0 0 0 .75-.75v-8.5A.75.75 0 0 0 14.25 3h-11.5Zm.75 1.5h10v7H3.5v-7Zm1.75 1a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Zm3 1a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 .75-.75Zm3 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z" />
                </svg>
              </span>
              <span>Chart view</span>
            </button>
            <button
              type="button"
              className={`pill ${viewMode === 'table' ? 'pill-active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <span className="icon-12">
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="M3 2.75A.75.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5a.75.75 0 0 1-.75.75h-9.5A1.75 1.75 0 0 1 2 11.25v-7.5A.75.75 0 0 1 2.75 3h.25v-.25ZM4.5 4v2.5h3V4h-3Zm4.5 0v2.5h3V4h-3Zm3 3.5h-3V10h3V7.5Zm-4.5 0h-3V10h3V7.5Z" />
                </svg>
              </span>
              <span>Table view</span>
            </button>
            </div>
          </div>
        </div>
      </div>
      <div className="metric-toggle-row-header">
        <div className="metric-toggle-title">Metrics displayed</div>
        <div className="metric-toggle-hint">Tap to show or hide indicators</div>
      </div>
      <div className="metric-toggle-row">
        {ACTIVE_METRIC_IDS.map((id) => (
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
            {labelByMetricId[id] ?? id}
          </button>
        ))}
      </div>

      {viewMode === 'chart' ? (
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
                yAxisId="left"
                tickFormatter={(v) => formatCompactNumber(v as number)}
                tickLine={false}
                tickMargin={8}
                stroke="rgba(148,163,184,0.9)"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => formatCompactNumber(v as number)}
                tickLine={false}
                tickMargin={8}
                stroke="rgba(148,163,184,0.6)"
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
              {ACTIVE_METRIC_IDS.map((metricId) => (
                <Line
                  key={metricId}
                  type="monotone"
                  dataKey={metricId}
                  stroke={METRIC_COLORS[metricId]}
                  strokeWidth={2}
                  dot={false}
                  hide={
                    !selectedMetricIds.includes(metricId) ||
                    !merged.some((row) => row[metricId] != null)
                  }
                  yAxisId={RIGHT_AXIS_METRICS.includes(metricId) ? 'right' : 'left'}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-table-wrapper">
          <div className="chart-table-scroll">
            <table className="chart-table">
              <thead>
                <tr>
                  <th>{frequency === 'yearly' ? 'Year' : 'Period'}</th>
                  {selectedMetricIds.map((id) => (
                    <th key={id}>{labelByMetricId[id] ?? id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {merged.map((row, rowIndex) => (
                  <tr key={String(row[xKey])}>
                    <td>{formatAxisLabel(row[xKey] as string | number)}</td>
                    {selectedMetricIds.map((id) => {
                      const v = row[id];
                      const prevRow = rowIndex > 0 ? merged[rowIndex - 1] : undefined;
                      const prev = prevRow && prevRow[id] != null ? (prevRow[id] as number) : null;

                      let changeText: string | null = null;
                      let changeDir: 'up' | 'down' | 'flat' | null = null;
                      if (prev != null && prev !== 0 && v != null) {
                        const pct = (((v as number) - prev) / Math.abs(prev)) * 100;
                        const rounded = Number.isFinite(pct) ? pct : 0;
                        if (rounded > 0.05) changeDir = 'up';
                        else if (rounded < -0.05) changeDir = 'down';
                        else changeDir = 'flat';
                        changeText = `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}% ${
                          freqLabel[frequency]
                        }`;
                      }

                      return (
                        <td key={id}>
                          {v == null ? (
                            '–'
                          ) : (
                            <div className="table-metric-cell">
                              <div className="table-metric-value">
                                {id === 'lifeExpectancy'
                                  ? (v as number).toFixed(1)
                                  : formatCompactNumber(v as number)}
                              </div>
                              {changeText && changeDir && (
                                <div
                                  className={`table-metric-change table-metric-change-${changeDir}`}
                                >
                                  {changeText}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
