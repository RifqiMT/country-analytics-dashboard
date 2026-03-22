import type { PestelSwot } from "../../types/pestel";
import { SWOT_STYLES } from "./pestelTheme";

type Key = keyof PestelSwot;

export default function PestelSwotGrid({ swot }: { swot: PestelSwot }) {
  const keys: Key[] = ["strengths", "weaknesses", "opportunities", "threats"];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">SWOT Analysis</h2>
          <p className="text-sm text-slate-500">Internal vs external, helpful vs harmful.</p>
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:text-right">
          internal · external · helpful · harmful
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {keys.map((k) => {
          const cfg = SWOT_STYLES[k];
          const items = swot[k];
          return (
            <div
              key={k}
              className="overflow-hidden rounded-xl border border-slate-200 shadow-sm"
            >
              <div
                className="px-4 py-2.5 text-center text-sm font-semibold text-white"
                style={{ backgroundColor: cfg.header }}
              >
                {cfg.title}
              </div>
              <div className="p-4 sm:p-5" style={{ backgroundColor: cfg.tint }}>
                <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-slate-800">
                  {items.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
