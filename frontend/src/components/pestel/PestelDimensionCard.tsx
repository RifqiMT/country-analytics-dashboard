import { useRef } from "react";
import type { PestelDimension } from "../../types/pestel";
import { PESTEL_DIMENSION_STYLES } from "./pestelTheme";
import ExportPngButton from "../ExportPngButton";

export default function PestelDimensionCard({ dim }: { dim: PestelDimension }) {
  const style = PESTEL_DIMENSION_STYLES[dim.label] ?? {
    header: "#475569",
    tint: "#f1f5f9",
  };
  const cardRef = useRef<HTMLDivElement | null>(null);
  const filename = `pestel_${dim.label.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.png`;

  return (
    <div ref={(n) => (cardRef.current = n)} className="relative flex overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <div className="absolute right-2 top-2 z-10">
        <ExportPngButton
          getTarget={() => cardRef.current}
          filename={filename}
          size="sm"
          title={`Export ${dim.label} chart (PNG)`}
        />
      </div>
      <div
        className="flex w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1 px-2 py-6 text-center text-white sm:w-28"
        style={{ backgroundColor: style.header }}
      >
        <span className="text-3xl font-bold leading-none">{dim.letter}</span>
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest">{dim.label}</span>
      </div>
      <div className="min-w-0 flex-1 p-4 sm:p-5" style={{ backgroundColor: style.tint }}>
        <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-slate-800">
          {dim.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
