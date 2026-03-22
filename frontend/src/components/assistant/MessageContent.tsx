import type { ReactNode } from "react";
import {
  highLevelFromSnippet,
  parseWebSourcesBody,
  sourceHostname,
  splitAssistantMainAndWebSources,
} from "../../lib/assistantWebSources";

export type AssistantMessageCitations = {
  D: Record<string, string>;
  W: Record<string, { title: string; url: string; snippet: string }>;
};

type TextSegment = { type: "text"; text: string };
type TableSegment = { type: "table"; rows: string[][] };
type Segment = TextSegment | TableSegment;

const CITE_TOKEN = /\[(D|W)(\d+)\]/g;

function WebSourcesSection({ body }: { body: string }) {
  const items = parseWebSourcesBody(body);
  if (items.length === 0) return null;
  return (
    <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50/90 p-3.5">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {items.length === 1 ? "Web source" : "Sources"}
      </p>
      <ul className="list-none space-y-3 p-0">
        {items.map((it, i) => {
          if (it.type === "fallback") {
            return (
              <li key={i} className="text-xs text-slate-600">
                {it.line}
              </li>
            );
          }
          const host = sourceHostname(it.url);
          return (
            <li key={i} className="border-b border-slate-200/80 pb-3 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline"
                >
                  {it.title}
                </a>
                {host ? (
                  <span className="text-[10px] font-medium tracking-wide text-slate-400">{host}</span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{it.summary}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function normalizeTableCell(s: string): string {
  return s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function tablesStructurallyEqual(a: string[][], b: string[][]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i]!;
    const rb = b[i]!;
    if (ra.length !== rb.length) return false;
    for (let j = 0; j < ra.length; j++) {
      if (normalizeTableCell(ra[j]!) !== normalizeTableCell(rb[j]!)) return false;
    }
  }
  return true;
}

/** Drop back-to-back identical GFM tables (e.g. model echoed prepended leaderboard). */
function dedupeConsecutiveTableSegments(segments: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const seg of segments) {
    if (seg.type === "table") {
      const prev = out[out.length - 1];
      if (prev?.type === "table" && tablesStructurallyEqual(prev.rows, seg.rows)) {
        continue;
      }
    }
    out.push(seg);
  }
  return out;
}

function MessageBodySegments({
  text: bodyText,
  citeEnabled,
  citations,
}: {
  text: string;
  citeEnabled: boolean;
  citations?: AssistantMessageCitations;
}) {
  const segments = dedupeConsecutiveTableSegments(splitIntoTextAndTables(bodyText));
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "table" ? (
          <GfmTable key={i} rows={seg.rows} />
        ) : (
          <InlineSegment key={i} text={seg.text} citations={citeEnabled ? citations : undefined} />
        )
      )}
    </>
  );
}

/** Renders assistant reply: markdown tables, links [text](url), bold **text**, inline [D#]/[W#] chips */
export default function MessageContent({
  text,
  citations,
}: {
  text: string;
  citations?: AssistantMessageCitations;
}) {
  const citeEnabled =
    citations &&
    (Object.keys(citations.D).length > 0 || Object.keys(citations.W).length > 0);
  const split = splitAssistantMainAndWebSources(text);
  if (split) {
    return (
      <div className="space-y-4 text-sm">
        {split.main.trim() ? (
          <MessageBodySegments
            text={split.main}
            citeEnabled={!!citeEnabled}
            citations={citations}
          />
        ) : null}
        <WebSourcesSection body={split.sourcesBody} />
      </div>
    );
  }
  return (
    <div className="space-y-4 text-sm">
      <MessageBodySegments text={text} citeEnabled={!!citeEnabled} citations={citations} />
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

function renderWithCitationTokens(raw: string, citations?: AssistantMessageCitations): ReactNode {
  if (!citations) return formatInline(raw);
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  CITE_TOKEN.lastIndex = 0;
  let k = 0;
  while ((m = CITE_TOKEN.exec(raw)) !== null) {
    const pre = raw.slice(last, m.index);
    if (pre) parts.push(<span key={`pre-${k}`}>{formatInline(pre)}</span>);
    const kind = m[1] as "D" | "W";
    const id = m[2]!;
    if (kind === "D") {
      const tip = citations.D[id];
      parts.push(
        <sup
          key={`d-${k++}`}
          className="ml-0.5 cursor-help align-super text-[10px] font-semibold text-teal-700"
          title={tip}
        >
          [D{id}]
        </sup>
      );
    } else {
      const w = citations.W[id];
      const title =
        w && w.snippet
          ? `${w.title} — ${highLevelFromSnippet(w.snippet, 160)}`
          : w
            ? w.title
            : undefined;
      parts.push(
        <a
          key={`w-${k++}`}
          href={w?.url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="ml-0.5 align-super text-[10px] font-semibold text-blue-600 hover:underline"
          title={title}
          onClick={(e) => {
            if (!w?.url) e.preventDefault();
          }}
        >
          [W{id}]
        </a>
      );
    }
    last = m.index + m[0].length;
  }
  const tail = raw.slice(last);
  if (tail) parts.push(<span key={`tail-${k}`}>{formatInline(tail)}</span>);
  if (parts.length === 0) return formatInline(raw);
  return parts.length === 1 ? parts[0]! : <>{parts}</>;
}

/** One paragraph: markdown links + bold + [D#]/[W#]; preserves single newlines inside the paragraph. */
function renderParagraphWithLinks(text: string, citations?: AssistantMessageCitations): ReactNode {
  const nodes: ReactNode[] = [];
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let lastIndex = 0;
  let m;
  let key = 0;

  while ((m = linkRe.exec(text)) !== null) {
    nodes.push(
      <span key={`t-${key++}`}>{renderWithCitationTokens(text.slice(lastIndex, m.index), citations)}</span>
    );
    nodes.push(
      <a
        key={`a-${m.index}`}
        href={m[2]}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-blue-600 hover:underline"
      >
        {m[1]}
      </a>
    );
    lastIndex = m.index + m[0].length;
  }
  nodes.push(<span key={`t-${key++}`}>{renderWithCitationTokens(text.slice(lastIndex), citations)}</span>);

  return <>{nodes}</>;
}

function InlineSegment({ text, citations }: { text: string; citations?: AssistantMessageCitations }) {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const blocks = paras.length > 0 ? paras : [text];

  if (blocks.length === 1) {
    return (
      <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
        {renderParagraphWithLinks(blocks[0]!, citations)}
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {blocks.map((para, i) => (
        <p key={i} className="whitespace-pre-wrap leading-relaxed text-slate-700">
          {renderParagraphWithLinks(para, citations)}
        </p>
      ))}
    </div>
  );
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
