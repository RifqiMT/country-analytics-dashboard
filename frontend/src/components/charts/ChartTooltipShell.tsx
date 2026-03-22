import type { CSSProperties, ReactNode } from "react";

/** Shared surface for all data tooltips (charts + map hover). */
export const CHART_TOOLTIP_SURFACE_CLASS =
  "max-w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200/90 bg-white/[0.97] px-4 py-3.5 shadow-[0_16px_48px_-12px_rgba(15,23,42,0.28)] backdrop-blur-md ring-1 ring-slate-900/[0.04]";

type ShellProps = { children: ReactNode; className?: string };

export function ChartTooltipShell({ children, className = "" }: ShellProps) {
  return (
    <div
      className={`${CHART_TOOLTIP_SURFACE_CLASS} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      {children}
    </div>
  );
}

/** Primary context line (e.g. year, quarter, week label). */
export function ChartTooltipHeading({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 border-b border-slate-100/90 pb-2.5 text-[0.9375rem] font-semibold leading-snug tracking-tight text-slate-900">
      {children}
    </p>
  );
}

/** Variant without the “Period” label — for map or single-context tooltips. */
export function ChartTooltipTitle({ children, subtle }: { children: ReactNode; subtle?: string }) {
  return (
    <div className="mb-3 border-b border-slate-100/90 pb-2.5">
      {subtle ? (
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-slate-500">{subtle}</p>
      ) : null}
      <p className={`text-[0.9375rem] font-semibold leading-snug tracking-tight text-slate-900 ${subtle ? "mt-0.5" : ""}`}>
        {children}
      </p>
    </div>
  );
}

export function ChartTooltipSeriesList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-3">{children}</ul>;
}

export function ChartTooltipSeriesRow({
  label,
  value,
  color,
  meta,
}: {
  label: string;
  value: string;
  color?: string;
  meta?: ReactNode;
}) {
  return (
    <li>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {color ? (
            <span
              className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_0_1px_rgba(15,23,42,0.06)]"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          ) : null}
          <span className="text-[0.8125rem] font-medium leading-snug text-slate-600">{label}</span>
        </div>
        <span className="shrink-0 text-right text-[0.8125rem] font-semibold tabular-nums leading-snug tracking-tight text-slate-900">
          {value}
        </span>
      </div>
      {meta ? (
        <p
          className={`mt-1.5 text-[0.6875rem] font-normal leading-relaxed text-slate-500 ${color ? "ml-7" : ""}`}
        >
          {meta}
        </p>
      ) : null}
    </li>
  );
}

/** Secondary note (e.g. metric description on map). */
export function ChartTooltipFootnote({ children }: { children: ReactNode }) {
  return <p className="mt-3 border-t border-slate-100/80 pt-2.5 text-[0.6875rem] leading-relaxed text-slate-500">{children}</p>;
}

/** Recharts default wrapper clips tooltips; keep them above charts. */
export const RECHARTS_TOOLTIP_WRAPPER: CSSProperties = {
  outline: "none",
  zIndex: 60,
};
