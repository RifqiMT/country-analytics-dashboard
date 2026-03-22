import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeriesProvenance } from "../../api";
import { CHART_POINT_PROVENANCE_KEY, type ChartRow } from "../../lib/chartSeries";
import { provenanceLabel } from "../../lib/provenanceLabels";
import {
  applyChartGranularity,
  GRANULARITY_DISCLAIMER,
  yearAxisTicksFromAnnualRows,
  type ChartGranularity,
} from "../../lib/chartGranularity";
import { formatCompactNumber } from "../../lib/formatValue";
import {
  ChartTooltipHeading,
  ChartTooltipSeriesList,
  ChartTooltipSeriesRow,
  ChartTooltipShell,
  RECHARTS_TOOLTIP_WRAPPER,
} from "../charts/ChartTooltipShell";
import ChartGranularityToggle from "../charts/ChartGranularityToggle";
import ChartTableToggle from "../charts/ChartTableToggle";
import SeriesLineDataTable, { type SeriesTableColumn } from "../charts/SeriesLineDataTable";

export type SeriesSpec = {
  key: string;
  label: string;
  color: string;
  yAxisId?: "left" | "right";
  tickFormatter?: (v: number) => string;
  /** Tooltip: `percent` → fixed decimals + %; default compact K / Mn / Bn / Tn. */
  tooltipFormat?: "compact" | "percent";
};

type Props = {
  title?: string;
  data: Record<string, number | string | null | undefined>[];
  series: SeriesSpec[];
  leftTickFormatter?: (v: number) => string;
  rightTickFormatter?: (v: number) => string;
  dualAxis?: boolean;
  /** When false (default), gaps in the source data break the line instead of bridging across nulls. */
  connectNulls?: boolean;
  /** Shown under the chart (e.g. how sparse WDI series are extended for display). */
  footnote?: string;
};

function LineChartTooltipBody(props: {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{
    dataKey?: string | number;
    name?: string | number;
    value?: unknown;
    payload?: ChartRow;
  }>;
  specByKey: Record<string, SeriesSpec>;
  formatTooltipValue: (dataKey: string, raw: unknown) => string;
}) {
  const { active, payload, label, specByKey, formatTooltipValue } = props;
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const provBag = row
    ? ((row as Record<string, unknown>)[CHART_POINT_PROVENANCE_KEY] as
        | Partial<Record<string, SeriesProvenance>>
        | undefined)
    : undefined;
  const periodLabel =
    row && typeof row.periodLabel === "string" ? row.periodLabel : `Year ${label ?? ""}`;
  return (
    <ChartTooltipShell>
      <ChartTooltipHeading>{periodLabel}</ChartTooltipHeading>
      <ChartTooltipSeriesList>
        {payload.map((item, i) => {
          const key = String(item.dataKey ?? "");
          const name = String(item.name ?? specByKey[key]?.label ?? key);
          const pl = provenanceLabel(provBag?.[key]);
          const entry = item as { color?: string };
          const dot = specByKey[key]?.color ?? entry.color;
          return (
            <ChartTooltipSeriesRow
              key={i}
              label={name}
              value={formatTooltipValue(key, item.value)}
              color={typeof dot === "string" ? dot : undefined}
              meta={pl ?? undefined}
            />
          );
        })}
      </ChartTooltipSeriesList>
    </ChartTooltipShell>
  );
}

export default function ToggleLineChart({
  title = "Metrics displayed",
  data,
  series,
  leftTickFormatter,
  rightTickFormatter,
  dualAxis = true,
  connectNulls = false,
  footnote,
}: Props) {
  const [granularity, setGranularity] = useState<ChartGranularity>("annual");
  const [on, setOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(series.map((s) => [s.key, true]))
  );

  const valueKeys = useMemo(() => series.map((s) => s.key), [series]);
  const chartData = useMemo(
    () => applyChartGranularity(data as ChartRow[], valueKeys, granularity),
    [data, valueKeys, granularity]
  );
  const yearTicks = useMemo(() => yearAxisTicksFromAnnualRows(data as ChartRow[]), [data]);

  const hasRight = useMemo(
    () => series.some((s) => (s.yAxisId ?? "left") === "right"),
    [series]
  );

  const specByKey = useMemo(() => Object.fromEntries(series.map((s) => [s.key, s])), [series]);

  const toggle = (key: string) => setOn((o) => ({ ...o, [key]: !o[key] }));

  const formatTooltipValue = (dataKey: string, raw: unknown): string => {
    if (raw === null || raw === undefined) return "—";
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) return "—";
    const spec = specByKey[dataKey];
    if (spec?.tooltipFormat === "percent") return `${n.toFixed(1)}%`;
    return formatCompactNumber(n, { maxFrac: 2 });
  };

  const tableColumns: SeriesTableColumn[] = useMemo(
    () =>
      series
        .filter((s) => on[s.key])
        .map((s) => ({
          key: s.key,
          label: s.label,
          format: s.tooltipFormat === "percent" ? ("percent" as const) : ("compact" as const),
        })),
    [series, on]
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <ChartGranularityToggle value={granularity} onChange={setGranularity} />
          <p className="text-xs text-slate-400">Tap to show or hide indicators</p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {series.map((s) => {
          const active = on[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? "border-slate-300 bg-white text-slate-800 shadow-sm"
                  : "border-slate-200 bg-slate-50 text-slate-400 line-through"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </button>
          );
        })}
      </div>
      <div className="h-80 w-full">
        <ChartTableToggle
          className="h-full w-full"
          vizTitle={title}
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="periodKey"
                  domain={["dataMin", "dataMax"]}
                  ticks={granularity === "annual" ? undefined : yearTicks}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => String(Math.round(v))}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={leftTickFormatter}
                />
                {dualAxis && hasRight && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickFormatter={rightTickFormatter}
                  />
                )}
                <Tooltip
                  wrapperStyle={RECHARTS_TOOLTIP_WRAPPER}
                  cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "5 5" }}
                  content={(tooltipProps) => (
                    <LineChartTooltipBody
                      active={tooltipProps.active}
                      label={tooltipProps.label}
                      payload={tooltipProps.payload}
                      specByKey={specByKey}
                      formatTooltipValue={formatTooltipValue}
                    />
                  )}
                />
                {series.map((s) =>
                  on[s.key] ? (
                    <Line
                      key={s.key}
                      yAxisId={dualAxis ? s.yAxisId ?? "left" : "left"}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={connectNulls}
                    />
                  ) : null
                )}
              </LineChart>
            </ResponsiveContainer>
          }
          table={
            <SeriesLineDataTable rows={chartData as Record<string, unknown>[]} columns={tableColumns} />
          }
        />
      </div>
      {granularity !== "annual" ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-400">{GRANULARITY_DISCLAIMER}</p>
      ) : null}
      {footnote ? (
        <p className={`text-xs leading-relaxed text-slate-400 ${granularity !== "annual" ? "mt-1" : "mt-3"}`}>
          {footnote}
        </p>
      ) : null}
    </div>
  );
}
