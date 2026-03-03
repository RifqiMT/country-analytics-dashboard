import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { CountryDashboardData } from '../types';
import { formatCompactNumber, formatPercentage } from '../utils/numberFormat';

interface Props {
  data?: CountryDashboardData;
}

const COLORS = ['#c8102e', '#f9f6f2', '#b37c00'];

export function PopulationPieSection({ data }: Props) {
  if (!data?.latestSnapshot?.metrics.population.ageBreakdown) {
    return (
      <section className="card">
        <h2 className="section-title">Population by age group</h2>
        <p className="muted">
          Loading population age structure from World Bank / UN Population Division...
        </p>
      </section>
    );
  }

  const breakdown = data.latestSnapshot.metrics.population.ageBreakdown;

  const chartData = breakdown.groups.map((g) => ({
    name: g.label,
    value: g.absolute ?? 0,
    pct: g.percentageOfPopulation ?? 0,
  }));

  return (
    <section className="card pie-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Population structure</h2>
          <p className="muted">
            Absolute counts and share of total population for key age groups.
          </p>
        </div>
        <div className="pill muted">
          Latest year: <strong>{breakdown.year}</strong>
        </div>
      </div>

      <div className="pie-layout">
        <div className="pie-chart-wrapper">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index % COLORS.length]}
                    stroke="#0b0b0b"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid rgba(148,163,184,0.6)',
                  borderRadius: 8,
                  boxShadow: '0 10px 30px rgba(15,23,42,0.16)',
                }}
                formatter={(value: number, _name, payload: any) => [
                  `${formatCompactNumber(value)} · ${formatPercentage(
                    payload.payload.pct,
                  )}`,
                  payload.name,
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pie-details">
          {chartData.map((g, idx) => (
            <div key={g.name} className="pie-detail-row">
              <span
                className="pie-swatch"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <div className="pie-detail-text">
                <div className="pie-detail-label">{g.name}</div>
                <div className="pie-detail-value">
                  {formatCompactNumber(g.value)} · {formatPercentage(g.pct)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

