import { useRef } from "react";
import type { PorterForce } from "../../types/porter";
import { PORTER_ACCENT_COLORS } from "./porterTheme";
import ExportPngButton from "../ExportPngButton";

export default function PorterForceCard({ force }: { force: PorterForce }) {
  const color = PORTER_ACCENT_COLORS[force.accent] ?? "#64748b";
  const cardRef = useRef<HTMLDivElement | null>(null);
  const filename = `porter_force_${force.number}_${force.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.png`;

  return (
    <div ref={(n) => (cardRef.current = n)} className="relative rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="absolute right-2 top-2 z-10">
        <ExportPngButton
          getTarget={() => cardRef.current}
          filename={filename}
          size="sm"
          title={`Export ${force.title} (PNG)`}
        />
      </div>
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
