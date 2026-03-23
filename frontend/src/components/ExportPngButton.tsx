import { useCallback, useRef } from "react";
import { exportElementToHighResPng } from "../lib/exportPng";

type Props = {
  getTarget: () => HTMLElement | null;
  filename: string;
  size?: "sm" | "md";
  title?: string;
};

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v10m0 0l-4-4m4 4l4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
    </svg>
  );
}

export default function ExportPngButton({ getTarget, filename, size = "sm", title }: Props) {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const onExport = useCallback(async () => {
    const target = getTarget();
    if (!target) return;
    const buttons = Array.from(target.querySelectorAll<HTMLButtonElement>('[data-export-png-btn="true"]'));
    const prevVisibilityByBtn = new Map<HTMLButtonElement, string>();
    for (const b of buttons) {
      prevVisibilityByBtn.set(b, b.style.visibility);
      b.style.visibility = "hidden";
    }
    try {
      await exportElementToHighResPng(target, filename);
    } finally {
      for (const b of buttons) {
        const prev = prevVisibilityByBtn.get(b);
        if (prev !== undefined) b.style.visibility = prev;
      }
    }
  }, [getTarget, filename]);

  const cls =
    size === "sm"
      ? "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 shadow-sm hover:bg-slate-50"
      : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm hover:bg-slate-50";

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onExport();
      }}
      className={`inline-flex items-center gap-2 ${cls}`}
      title={title ?? "Export high-res PNG"}
      aria-label={title ?? "Export high-res PNG"}
      data-export-png-btn="true"
    >
      <DownloadIcon />
      {size === "md" ? <span className="text-xs font-semibold">Download PNG</span> : null}
    </button>
  );
}

