import type { PorterForce } from "../../types/porter";
import { PORTER_ACCENT_COLORS } from "./porterTheme";

export default function PorterForceCard({ force }: { force: PorterForce }) {
  const color = PORTER_ACCENT_COLORS[force.accent] ?? "#64748b";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        className="h-1 rounded-t-xl"
        style={{ backgroundColor: color }}
      />
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {force.number}
          </div>
          <h3 className="font-bold text-slate-900">{force.title}</h3>
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-4 text-sm leading-relaxed text-slate-600">
          {force.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
