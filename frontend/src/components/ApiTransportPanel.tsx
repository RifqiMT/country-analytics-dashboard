import { useCallback, useEffect, useState } from "react";
import { subscribeApiTransport, type ApiTransportEvent } from "../api";

function formatClock(ts: number): string {
  try {
    const d = new Date(ts);
    return `${d.toLocaleTimeString(undefined, { hour12: false })}.${String(d.getMilliseconds()).padStart(3, "0")}`;
  } catch {
    return String(ts);
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** Short summary for the collapsed chip (no paths or raw errors). */
function collapsedSummary(events: ApiTransportEvent[]): { line1: string; line2: string; tone: "neutral" | "ok" | "fail" } {
  if (events.length === 0) {
    return { line1: "API activity", line2: "No requests yet", tone: "neutral" };
  }
  const last = events[0]!;
  const n = events.length;
  const countLabel = n === 1 ? "1 call" : `${n} calls`;
  if (last.outcome === "success") {
    return {
      line1: "API activity",
      line2: `${countLabel} · last ${last.durationSec.toFixed(2)}s · OK`,
      tone: "ok",
    };
  }
  return {
    line1: "API activity",
    line2: `${countLabel} · last failed (${last.durationSec.toFixed(2)}s)`,
    tone: "fail",
  };
}

export default function ApiTransportPanel() {
  const [events, setEvents] = useState<ApiTransportEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    return subscribeApiTransport((e) => {
      setEvents((prev) => [e, ...prev].slice(0, 100));
    });
  }, []);

  const toggleExcerpt = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEvents([]);
    setExpandedIds(new Set());
  }, []);

  const { line1, line2, tone } = collapsedSummary(events);

  const chipStyles =
    tone === "fail"
      ? "border-red-200 bg-red-50/95 text-red-950 hover:bg-red-100/95"
      : tone === "ok"
        ? "border-slate-200 bg-white/95 text-slate-900 hover:bg-slate-50/95"
        : "border-slate-200 bg-white/95 text-slate-700 hover:bg-slate-50/95";

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col-reverse items-start gap-2 sm:bottom-4 sm:left-4">
      {open && (
        <div
          id="api-transport-log-panel"
          className="pointer-events-auto max-h-[min(70vh,560px)] w-[min(100vw-1.5rem,440px)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/98 shadow-[0_16px_48px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/[0.04] backdrop-blur-sm"
          role="region"
          aria-label="API request log — full detail"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Request log
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                Each <code className="rounded bg-slate-200/80 px-1">getJson</code> /{" "}
                <code className="rounded bg-slate-200/80 px-1">postJson</code> call: duration, HTTP status, size,
                and errors with optional response body.
              </p>
            </div>
            {events.length > 0 ? (
              <button
                type="button"
                onClick={clear}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
              >
                Clear
              </button>
            ) : null}
          </div>
          <ul className="max-h-[min(60vh,480px)] divide-y divide-slate-100 overflow-y-auto overscroll-contain">
            {events.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">No API calls recorded yet.</li>
            ) : (
              events.map((e) => (
                <li
                  key={e.id}
                  className={`px-3 py-2.5 text-xs ${
                    e.outcome === "success" ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-red-500"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span
                      className={`font-bold ${e.outcome === "success" ? "text-emerald-800" : "text-red-800"}`}
                    >
                      {e.outcome === "success" ? "OK" : "FAIL"}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                      {e.method}
                    </span>
                    <span className="min-w-0 break-all font-mono text-[11px] text-slate-800">{e.path}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                    <span>
                      <span className="text-slate-400">Time</span>{" "}
                      <span className="font-mono font-semibold tabular-nums text-slate-900">
                        {e.durationSec.toFixed(3)} s
                      </span>
                    </span>
                    {e.outcome === "success" ? (
                      <>
                        <span>
                          <span className="text-slate-400">HTTP</span>{" "}
                          <span className="font-mono font-semibold">{e.status}</span>
                        </span>
                        <span>
                          <span className="text-slate-400">Size</span>{" "}
                          <span className="font-mono">{formatBytes(e.responseBytes)}</span>
                        </span>
                      </>
                    ) : (
                      <span>
                        <span className="text-slate-400">HTTP</span>{" "}
                        <span className="font-mono font-semibold">{e.status ?? "—"}</span>
                      </span>
                    )}
                    <span className="text-slate-400">{formatClock(e.at)}</span>
                  </div>
                  {e.outcome === "failure" && (
                    <div className="mt-1.5">
                      <p className="break-words font-medium text-red-800">{e.error}</p>
                      {e.bodyExcerpt ? (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => toggleExcerpt(e.id)}
                            className="text-[11px] font-semibold text-red-700 underline decoration-red-300 hover:decoration-red-600"
                          >
                            {expandedIds.has(e.id) ? "Hide response body" : "Show response body"}
                          </button>
                          {expandedIds.has(e.id) ? (
                            <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-slate-900/95 p-2 font-mono text-[10px] leading-relaxed text-slate-100">
                              {e.bodyExcerpt}
                            </pre>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`pointer-events-auto flex min-w-[11rem] max-w-[min(18rem,calc(100vw-1.5rem))] items-center gap-2 rounded-2xl border px-3 py-2.5 text-left shadow-md ring-1 ring-black/5 transition ${chipStyles}`}
        aria-expanded={open}
        aria-controls={open ? "api-transport-log-panel" : undefined}
        id="api-transport-toggle"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900/[0.06] text-slate-600"
          aria-hidden
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{line1}</span>
            <span
              className={`text-slate-400 transition-transform ${open ? "-rotate-180" : ""}`}
              aria-hidden
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </span>
          </span>
          <span className="mt-0.5 block text-[12px] font-medium leading-snug text-slate-800">{line2}</span>
          <span className="mt-1 block text-[10px] text-slate-500">Tap to {open ? "collapse" : "expand"} details</span>
        </span>
      </button>
    </div>
  );
}
