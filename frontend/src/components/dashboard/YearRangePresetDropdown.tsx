import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MIN_DATA_YEAR } from "../../lib/yearBounds";

export type YearPresetKind = "full" | "10" | "5";

type Props = {
  start: number;
  end: number;
  maxYear: number;
  onSelect: (kind: YearPresetKind) => void;
};

function activePreset(start: number, end: number, maxYear: number): YearPresetKind | "custom" {
  if (start === MIN_DATA_YEAR && end === maxYear) return "full";
  if (end === maxYear && start === maxYear - 9) return "10";
  if (end === maxYear && start === maxYear - 4) return "5";
  return "custom";
}

const LABELS: Record<YearPresetKind, string> = {
  full: "Full range",
  "10": "Last 10 years",
  "5": "Last 5 years",
};

const ROWS: readonly { kind: YearPresetKind; title: string; sub: (max: number) => string }[] = [
  { kind: "full", title: "Full range", sub: (max) => `${MIN_DATA_YEAR}–${max}` },
  { kind: "10", title: "Last 10 years", sub: (max) => `${max - 9}–${max}` },
  { kind: "5", title: "Last 5 years", sub: (max) => `${max - 4}–${max}` },
];

export default function YearRangePresetDropdown({ start, end, maxYear, onSelect }: Props) {
  const active = activePreset(start, end, maxYear);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = useCallback(
    (kind: YearPresetKind) => {
      onSelect(kind);
      setOpen(false);
    },
    [onSelect]
  );

  const summary =
    active === "custom"
      ? `${start}–${end}`
      : active === "full"
        ? `${MIN_DATA_YEAR}–${maxYear}`
        : active === "10"
          ? `${maxYear - 9}–${maxYear}`
          : `${maxYear - 4}–${maxYear}`;

  const headline = active === "custom" ? "Custom range" : LABELS[active];

  return (
    <div ref={rootRef} className="relative w-full min-w-[10rem] sm:w-auto sm:min-w-[12rem]">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <span className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Quick preset</span>
          <span className="block truncate text-sm font-semibold text-slate-900">{headline}</span>
          <span className="block truncate text-xs text-slate-500">{summary}</span>
        </span>
        <svg
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Year range presets"
          className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {ROWS.map((row) => {
            const sel = active === row.kind;
            return (
              <li key={row.kind} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={sel}
                  onClick={() => choose(row.kind)}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition ${
                    sel ? "bg-red-50 text-red-950" : "text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold">{row.title}</span>
                  <span className="text-xs text-slate-500">{row.sub(maxYear)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
