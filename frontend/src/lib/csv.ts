import { emitClientToast } from "../api";

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const t0 = performance.now();
  try {
    const esc = (v: string | number | null) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    const durationSec = Math.round(((performance.now() - t0) / 1000) * 1000) / 1000;
    emitClientToast({
      outcome: "success",
      title: "CSV export",
      detail: filename,
      durationSec,
    });
  } catch (e) {
    const durationSec = Math.round(((performance.now() - t0) / 1000) * 1000) / 1000;
    emitClientToast({
      outcome: "failure",
      title: "CSV export",
      detail: filename,
      durationSec,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

/**
 * Trigger a browser download from a data URL (e.g. PNG from canvas).
 * Shows the same toast stack as CSV exports.
 */
export function downloadDataUrlAsFile(dataUrl: string, filename: string, formatLabel: "PNG" | "SVG" | "Image" = "PNG") {
  const t0 = performance.now();
  try {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.rel = "noopener";
    a.click();
    const durationSec = Math.round(((performance.now() - t0) / 1000) * 1000) / 1000;
    emitClientToast({
      outcome: "success",
      title: `${formatLabel} export`,
      detail: filename,
      durationSec,
    });
  } catch (e) {
    const durationSec = Math.round(((performance.now() - t0) / 1000) * 1000) / 1000;
    emitClientToast({
      outcome: "failure",
      title: `${formatLabel} export`,
      detail: filename,
      durationSec,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}
