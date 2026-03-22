import type { ReactNode } from "react";
import { yoYClass } from "../../lib/formatValue";

export type YoYDisplay = { text: string; tone: "up" | "down" | "flat" };

type Props = {
  icon?: ReactNode;
  label: string;
  value: string;
  yoy?: YoYDisplay;
};

export default function MetricCard({ icon, label, value, yoy }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-2">
        {icon && <div className="mt-0.5 text-teal-600">{icon}</div>}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-semibold leading-tight text-slate-900">{value}</p>
          {yoy && yoy.text !== "—" && (
            <p className={`mt-1 text-xs font-medium ${yoYClass(yoy.tone)}`}>{yoy.text}</p>
          )}
        </div>
      </div>
    </div>
  );
}
