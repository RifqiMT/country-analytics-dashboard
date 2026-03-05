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
import type { CountryDashboardData } from '../types';
import { formatCompactNumber, formatPercentage } from '../utils/numberFormat';

interface Props {
  data?: CountryDashboardData;
}

interface TooltipPayloadItem {
  value?: number;
  name?: string;
  payload?: { pct?: number };
}

function PopulationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const payloadData = p.payload as { pct?: number; value?: number; color?: string };
  const value = payloadData?.value ?? 0;
  const pct = payloadData?.pct ?? 0;
  const color = payloadData?.color;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{p.name}</div>
      <div className="chart-tooltip-body">
        <div className="chart-tooltip-row">
          <span
            className="chart-tooltip-dot"
            style={{ backgroundColor: color ?? '#6b7280' }}
          />
          <div className="chart-tooltip-label">Population</div>
          <div className="chart-tooltip-value">{formatCompactNumber(value)}</div>
        </div>
        <div className="chart-tooltip-row">
          <span
            className="chart-tooltip-dot"
            style={{ backgroundColor: color ?? '#6b7280' }}
          />
          <div className="chart-tooltip-label">Share</div>
          <div className="chart-tooltip-value">{formatPercentage(pct)}</div>
        </div>
      </div>
    </div>
  );
}

const POP_COLORS = [
  '#c8102e', // 0–14: Indonesian red
  '#0369a1', // 15–64: blue (working age)
  '#b45309', // 65+: gold/brown (senior)
];

export function PopulationPieSection({ data }: Props) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  if (!data?.latestSnapshot?.metrics?.population?.ageBreakdown?.groups?.length) {
    return (
      <section className="card population-structure-card">
        <h2 className="section-title">Population by age group</h2>
        <p className="muted">
          Loading population age structure from World Bank / UN Population Division...
        </p>
      </section>
    );
  }

  const breakdown = data.latestSnapshot!.metrics.population!.ageBreakdown!;
  const groups = breakdown.groups ?? [];
  const chartData = groups.map((g, idx) => ({
    name: g.label,
    value: g.absolute ?? 0,
    pct: g.percentageOfPopulation ?? 0,
    color: POP_COLORS[idx % POP_COLORS.length],
  }));

  return (
    <section className="card population-structure-card">
      <div className="population-structure-header">
        <div>
          <h2 className="section-title">Population structure</h2>
          <p className="muted">
            Absolute counts and share of total population for key age groups.
          </p>
        </div>
        <div className="population-structure-header-right">
          <div className="pill-group pill-group-secondary">
            <button
              type="button"
              className={`pill ${viewMode === 'chart' ? 'pill-active' : ''}`}
              onClick={() => setViewMode('chart')}
            >
              Chart
            </button>
            <button
              type="button"
              className={`pill ${viewMode === 'table' ? 'pill-active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
          </div>
          <div className="population-structure-year">
            <span className="population-structure-year-label">Latest year</span>
            <span className="population-structure-year-value">{breakdown.year}</span>
          </div>
        </div>
      </div>

      <div className="population-structure-body">
        {viewMode === 'chart' ? (
          <>
            <div className="population-structure-chart">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 24, bottom: 24, left: 8 }}
                >
                  <CartesianGrid
                    stroke="rgba(148,163,184,0.25)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={8}
                    stroke="rgba(148,163,184,0.9)"
                  />
                  <YAxis
                    tickFormatter={(v) => formatPercentage(v as number)}
                    tickLine={false}
                    tickMargin={8}
                    stroke="rgba(148,163,184,0.9)"
                  />
                  <Tooltip
                    content={<PopulationTooltip />}
                    wrapperStyle={{ outline: 'none' }}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid rgba(148,163,184,0.6)',
                      borderRadius: 8,
                      boxShadow: '0 10px 30px rgba(15,23,42,0.16)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke="#0f766e"
                    strokeWidth={2}
                    dot={{ r: 5, strokeWidth: 1 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="population-structure-legend">
              {chartData.map((g, idx) => (
                <div key={g.name} className="population-structure-item">
                  <span
                    className="population-structure-swatch"
                    style={{ backgroundColor: POP_COLORS[idx % POP_COLORS.length] }}
                  />
                  <div className="population-structure-item-content">
                    <span className="population-structure-item-label">{g.name}</span>
                    <span className="population-structure-item-meta">
                      {formatCompactNumber(g.value)} · {formatPercentage(g.pct)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="chart-table-wrapper population-structure-table-wrapper">
            <div className="chart-table-scroll">
              <table className="chart-table">
                <thead>
                  <tr>
                    <th>Age group</th>
                    <th>Population</th>
                    <th>Share of total</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((g) => (
                    <tr key={g.name}>
                      <td>{g.name}</td>
                      <td>{formatCompactNumber(g.value)}</td>
                      <td>{formatPercentage(g.pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

