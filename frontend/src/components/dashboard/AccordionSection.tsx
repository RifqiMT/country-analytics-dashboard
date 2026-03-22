import type { ReactNode } from "react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  onDownload?: () => void;
  children: ReactNode;
};

export default function AccordionSection({ title, defaultOpen = true, onDownload, children }: Props) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="text-slate-400 transition group-open:rotate-0">▼</span>
          {title}
        </span>
        {onDownload && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onDownload();
            }}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            title="Download"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
              />
            </svg>
          </button>
        )}
      </summary>
      <div className="border-t border-slate-100 px-4 pb-3 pt-1.5">{children}</div>
    </details>
  );
}
