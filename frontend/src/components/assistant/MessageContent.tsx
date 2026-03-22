import type { ReactNode } from "react";

type TextSegment = { type: "text"; text: string };
type TableSegment = { type: "table"; rows: string[][] };
type Segment = TextSegment | TableSegment;

/** Renders assistant reply: markdown tables, links [text](url), bold **text** */
export default function MessageContent({ text }: { text: string }) {
  const segments = splitIntoTextAndTables(text);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      {segments.map((seg, i) =>
        seg.type === "table" ? <GfmTable key={i} rows={seg.rows} /> : <InlineSegment key={i} text={seg.text} />
      )}
    </div>
  );
}

function splitIntoTextAndTables(raw: string): Segment[] {
  const lines = raw.split(/\r?\n/);
  const out: Segment[] = [];
  const textBuf: string[] = [];
  let i = 0;

  const flushText = () => {
    if (textBuf.length === 0) return;
    const t = textBuf.join("\n");
    textBuf.length = 0;
    if (t.trim()) out.push({ type: "text", text: t });
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    const looksLikeRow = trimmed.startsWith("|") && trimmed.endsWith("|");
    if (looksLikeRow && i + 1 < lines.length) {
      const nextTrim = (lines[i + 1] ?? "").trim();
      if (nextTrim.startsWith("|") && isTableSeparatorRow(nextTrim)) {
        flushText();
        const rawRows: string[] = [];
        while (i < lines.length) {
          const L = (lines[i] ?? "").trim();
          if (!L.startsWith("|")) break;
          rawRows.push(L);
          i++;
        }
        const rows = parseGfmTableRows(rawRows);
        if (rows.length >= 1) out.push({ type: "table", rows });
        continue;
      }
    }
    textBuf.push(line);
    i++;
  }
  flushText();
  return out;
}

function isTableSeparatorRow(line: string): boolean {
  const inner = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "");
  const cells = inner
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  if (cells.length < 2) return false;
  return cells.every((c) => /^[\s\-:]+$/.test(c) && c.replace(/[-:]/g, "").length === 0);
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function parseGfmTableRows(raw: string[]): string[][] {
  const parsed = raw.map(parseTableRow);
  const sepIdx = parsed.findIndex((row) => row.every((c) => /^[\s\-:]+$/.test(c)));
  if (sepIdx < 0) return parsed.filter((row) => row.some((c) => c.length > 0));
  return parsed.filter((_, idx) => idx !== sepIdx);
}

function GfmTable({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const [head, ...body] = rows;
  if (!head?.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {head.map((h, j) => (
              <th key={j} className="whitespace-nowrap px-3 py-2 font-semibold text-slate-800">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((tr, ri) => (
            <tr key={ri} className="border-b border-slate-100 last:border-0">
              {tr.map((td, ci) => (
                <td key={ci} className="px-3 py-1.5 text-slate-700">
                  {td}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineSegment({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let lastIndex = 0;
  let m;

  while ((m = linkRe.exec(text)) !== null) {
    nodes.push(formatInline(text.slice(lastIndex, m.index)));
    nodes.push(
      <a
        key={m.index}
        href={m[2]}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 hover:underline"
      >
        {m[1]}
      </a>
    );
    lastIndex = m.index + m[0].length;
  }
  nodes.push(formatInline(text.slice(lastIndex)));

  return <div className="whitespace-pre-wrap">{nodes}</div>;
}

function formatInline(s: string): ReactNode {
  const parts: ReactNode[] = [];
  const boldRe = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m;
  while ((m = boldRe.exec(s)) !== null) {
    parts.push(s.slice(last, m.index));
    parts.push(<strong key={m.index}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  parts.push(s.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
