import { useCallback, useMemo, useState } from "react";
import { cmpNullableNumber, cmpString, toggleColumnSort, type SortDir } from "../../lib/tableSort";
import SortableTh from "../ui/SortableTh";
import {
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactNumber } from "../../lib/formatValue";
import {
  ChartTooltipHeading,
  ChartTooltipSeriesList,
  ChartTooltipSeriesRow,
  ChartTooltipShell,
  RECHARTS_TOOLTIP_WRAPPER,
} from "../charts/ChartTooltipShell";
import ChartTableToggle from "../charts/ChartTableToggle";

type Point = {
  countryIso3: string;
  countryName: string;
  year: number;
  x: number;
  y: number;
  isHighlight: boolean;
};

function CorrelationTooltip({
  active,
  payload,
  labelX,
  labelY,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  label?: unknown;
  labelX: string;
  labelY: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as Point | undefined;
  if (!p) return null;
  return (
    <ChartTooltipShell>
      <ChartTooltipHeading>
        {p.countryName}
        <span className="font-medium text-slate-500"> · </span>
        <span className="font-medium tabular-nums text-slate-600">{p.year}</span>
      </ChartTooltipHeading>
      <ChartTooltipSeriesList>
        <ChartTooltipSeriesRow
          label={labelX}
          value={formatCompactNumber(p.x, { maxFrac: 2 })}
          color="#ef4444"
        />
        <ChartTooltipSeriesRow
          label={labelY}
          value={formatCompactNumber(p.y, { maxFrac: 2 })}
          color="#38bdf8"
        />
      </ChartTooltipSeriesList>
    </ChartTooltipShell>
  );
}

type Props = {
  points: Point[];
  ciBand: { x: number; yLower: number; yUpper: number }[];
  slope: number | null;
  intercept: number | null;
  labelX: string;
  labelY: string;
  highlightName: string;
  correlation: number | null;
};

export default function CorrelationScatter({
  points,
  ciBand,
  slope,
  intercept,
  labelX,
  labelY,
  highlightName,
  correlation,
}: Props) {
  const regLine = slope !== null && intercept !== null && points.length > 0
    ? (() => {
        const xs = points.map((p) => p.x);
        const xMin = Math.min(...xs);
        const xMax = Math.max(...xs);
        return [
          { x: xMin, y: intercept + slope * xMin },
          { x: xMax, y: intercept + slope * xMax },
        ];
      })()
    : [];

  const regular = points.filter((p) => !p.isHighlight).map((p) => ({ ...p, x: p.x, y: p.y }));
  const highlighted = points.filter((p) => p.isHighlight).map((p) => ({ ...p, x: p.x, y: p.y }));

  const corrStr = correlation !== null ? correlation.toFixed(3) : "—";

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const onSort = useCallback(
    (key: string) => {
      const n = toggleColumnSort(sortKey, sortDir, key);
      setSortKey(n.col);
      setSortDir(n.dir);
    },
    [sortKey, sortDir]
  );

  const tableRows = useMemo(() => {
    const copy = [...points];
    if (sortKey === null) {
      copy.sort((a, b) => a.countryName.localeCompare(b.countryName));
      return copy;
    }
    copy.sort((a, b) => {
      if (sortKey === "countryName") return cmpString(a.countryName, b.countryName, sortDir);
      if (sortKey === "year") return cmpNullableNumber(a.year, b.year, sortDir);
      if (sortKey === "x") return cmpNullableNumber(a.x, b.x, sortDir);
      if (sortKey === "y") return cmpNullableNumber(a.y, b.y, sortDir);
      if (sortKey === "selected") return cmpNullableNumber(a.isHighlight ? 1 : 0, b.isHighlight ? 1 : 0, sortDir);
      return 0;
    });
    return copy;
  }, [points, sortKey, sortDir]);

  return (
    <div className="min-h-[400px] w-full">
      <ChartTableToggle
        className="h-[400px] w-full"
        vizTitle={`${labelX} vs ${labelY}`}
        chart={
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
              <XAxis
                type="number"
                dataKey="x"
                tickFormatter={(v) => formatCompactNumber(Number(v), { maxFrac: 1 })}
                stroke="#94a3b8"
                fontSize={11}
                domain={["auto", "auto"]}
              />
              <YAxis
                type="number"
                tickFormatter={(v) => formatCompactNumber(Number(v), { maxFrac: 1 })}
                stroke="#94a3b8"
                fontSize={11}
                domain={["auto", "auto"]}
              />
              <Tooltip
                wrapperStyle={RECHARTS_TOOLTIP_WRAPPER}
                cursor={{ strokeDasharray: "4 4", stroke: "#94a3b8", strokeWidth: 1 }}
                content={(props) => (
                  <CorrelationTooltip
                    active={props.active}
                    payload={props.payload}
                    label={props.label}
                    labelX={labelX}
                    labelY={labelY}
                  />
                )}
              />
              {ciBand.length > 0 && (
                <>
                  <Line
                    type="monotone"
                    data={ciBand}
                    dataKey="yUpper"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    dot={false}
                    connectNulls
                    name="95% CI"
                  />
                  <Line
                    type="monotone"
                    data={ciBand}
                    dataKey="yLower"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    dot={false}
                    connectNulls
                  />
                </>
              )}
              {regLine.length > 0 && (
                <Line
                  type="monotone"
                  data={regLine}
                  dataKey="y"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  name="Trend line"
                />
              )}
              <Scatter data={regular} fill="#ef4444" fillOpacity={0.4} name="Countries" />
              {highlighted.length > 0 && (
                <Scatter
                  data={highlighted}
                  fill="#eab308"
                  fillOpacity={1}
                  name={`Selected: ${highlightName}`}
                />
              )}
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value) => <span className="text-slate-600">{value}</span>}
              />
            </ComposedChart>
          </ResponsiveContainer>
        }
        table={
          <table className="w-full min-w-[320px] border-collapse text-left text-xs">
            <thead>
              <tr className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50">
                <SortableTh
                  columnKey="countryName"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  className="whitespace-nowrap px-3 py-2 text-slate-600"
                >
                  Country
                </SortableTh>
                <SortableTh
                  columnKey="year"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  className="whitespace-nowrap px-3 py-2 text-slate-600"
                >
                  Year
                </SortableTh>
                <SortableTh
                  columnKey="x"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  className="whitespace-nowrap px-3 py-2 text-slate-600"
                >
                  {labelX}
                </SortableTh>
                <SortableTh
                  columnKey="y"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  className="whitespace-nowrap px-3 py-2 text-slate-600"
                >
                  {labelY}
                </SortableTh>
                <SortableTh
                  columnKey="selected"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  className="whitespace-nowrap px-3 py-2 text-slate-600"
                >
                  Selected
                </SortableTh>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((p) => (
                <tr
                  key={`${p.countryIso3}-${p.year}`}
                  className="border-b border-slate-100 hover:bg-slate-50/80"
                >
                  <td className="px-3 py-1.5 text-slate-800">{p.countryName}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-slate-600">{p.year}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-slate-800">
                    {formatCompactNumber(p.x, { maxFrac: 2 })}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-slate-800">
                    {formatCompactNumber(p.y, { maxFrac: 2 })}
                  </td>
                  <td className="px-3 py-1.5 text-slate-600">{p.isHighlight ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      />
      <p className="mt-2 text-center text-sm font-medium text-slate-600">
        Scatter Plot: {labelX} vs {labelY} | Corr = {corrStr}
      </p>
    </div>
  );
}
