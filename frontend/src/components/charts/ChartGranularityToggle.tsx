import type { ChartGranularity } from "../../lib/chartGranularity";
import { CHART_GRANULARITIES } from "../../lib/chartGranularity";

type Props = {
  value: ChartGranularity;
  onChange: (g: ChartGranularity) => void;
  className?: string;
};

export default function ChartGranularityToggle({ value, onChange, className = "" }: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">View</span>
      {CHART_GRANULARITIES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
            value === id
              ? "bg-slate-800 text-white"
              : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
