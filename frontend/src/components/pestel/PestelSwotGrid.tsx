import { useRef } from "react";
import type { PestelSwot } from "../../types/pestel";
import { SWOT_STYLES } from "./pestelTheme";
import ExportPngButton from "../ExportPngButton";

type Key = keyof PestelSwot;

function splitIntoSentences(raw: string): string[] {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return [];
  // Split on sentence-ending punctuation (. ! ?) and keep the punctuation.
  // If there is no sentence-ending punctuation, the full text is returned as one sentence.
  const parts = t.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return parts.map((p) => p.trim()).filter(Boolean);
}

export default function PestelSwotGrid({ swot }: { swot: PestelSwot }) {
  const keys: Key[] = ["strengths", "weaknesses", "opportunities", "threats"];
  const swotRef = useRef<HTMLElement | null>(null);
  const MAX_SENTENCES_PER_CARD = 6;

  return (
    <section ref={(n) => (swotRef.current = n)} className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">SWOT Analysis</h2>
          <p className="text-sm text-slate-500">Internal vs external, helpful vs harmful.</p>
        </div>
        <div className="flex items-center gap-2 sm:self-end">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:text-right">
            internal · external · helpful · harmful
          </p>
          <ExportPngButton
            getTarget={() => swotRef.current}
            filename="pestel_swot_analysis.png"
            size="md"
            title="Export SWOT Analysis (PNG)"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:auto-rows-fr">
        {keys.map((k) => {
          const cfg = SWOT_STYLES[k];
          const items = swot[k];
          return (
            <div
              key={k}
              className="flex h-full overflow-hidden flex-col rounded-xl border border-slate-200 shadow-sm"
            >
              <div
                className="px-4 py-2.5 text-center text-sm font-semibold text-white"
                style={{ backgroundColor: cfg.header }}
              >
                {cfg.title}
              </div>
              <div className="flex-1 p-4 sm:p-5" style={{ backgroundColor: cfg.tint }}>
                <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-slate-800">
                  {items
                    .flatMap((line) => splitIntoSentences(String(line)))
                    .slice(0, MAX_SENTENCES_PER_CARD)
                    .map((sentence, i) => (
                      <li key={`${k}-s-${i}`} className="line-clamp-2">
                        {sentence}
                      </li>
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
