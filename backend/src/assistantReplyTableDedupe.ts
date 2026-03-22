/**
 * Removes redundant GFM pipe tables from the LLM narrative when the API already prepends
 * platform ranking markdown (leaderboard + focus-vs-leader tables), which otherwise duplicates in the UI.
 */

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
    .map((c) => c.trim().replace(/\*\*/g, ""));
}

function parseGfmTableRows(raw: string[]): string[][] {
  const parsed = raw.map(parseTableRow);
  const sepIdx = parsed.findIndex((row) => row.every((c) => /^[\s\-:]+$/.test(c)));
  if (sepIdx < 0) return parsed.filter((row) => row.some((c) => c.length > 0));
  return parsed.filter((_, idx) => idx !== sepIdx);
}

/** True when this table matches the prepended platform ranking or focus-vs-leader shapes. */
function isRedundantPlatformRankingTable(rows: string[][]): boolean {
  if (rows.length < 2) return false;
  const head = rows[0]!.map((c) => c.toLowerCase());
  const joined = head.join(" | ");

  if (/\brank\b/.test(joined) && /\bcountry\b/.test(joined) && (/\biso3\b/.test(joined) || /\bvalue\b/.test(joined))) {
    return true;
  }
  if (/#\s*1\s+in\s+table\s+above/i.test(joined) || /dashboard\s+focus\s+vs/i.test(joined)) {
    return true;
  }
  if (/\bfocus\b.*\bleaderboard\b/i.test(joined)) {
    return true;
  }
  const c0 = head[0]?.trim().toLowerCase() ?? "";
  if (
    (c0 === "#" || c0 === "no." || c0 === "pos." || c0 === "position") &&
    /\b(country|nation|economy)\b/.test(joined)
  ) {
    return true;
  }
  return false;
}

/**
 * Strips GFM tables that would duplicate prepended ranking UI tables.
 * Safe to call when `rankingMarkdown` was not prepended (no-op on unrelated tables).
 */
export function stripRedundantRankingTablesFromLlmMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && i + 1 < lines.length) {
      const nextTrim = (lines[i + 1] ?? "").trim();
      if (nextTrim.startsWith("|") && isTableSeparatorRow(nextTrim)) {
        const rawRows: string[] = [];
        const start = i;
        while (i < lines.length) {
          const L = (lines[i] ?? "").trim();
          if (!L.startsWith("|")) break;
          rawRows.push(L);
          i++;
        }
        const rows = parseGfmTableRows(rawRows);
        if (isRedundantPlatformRankingTable(rows)) {
          while (out.length > 0 && (out[out.length - 1] ?? "").trim() === "") {
            out.pop();
          }
          continue;
        }
        for (let k = 0; k < rawRows.length; k++) {
          out.push(lines[start + k]!);
        }
        continue;
      }
    }
    out.push(line);
    i++;
  }

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
