/** Turn raw Tavily-style snippets into short, readable blurbs (no pipe tables). */
export function highLevelFromSnippet(snippet: string, maxLen = 132): string {
  let s = snippet
    .replace(/\|/g, " ")
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "";
  if (/^(rank\s*\|?\s*country|#\s*\||\|\s*rank|\|\s*#\s*\|)/i.test(s) && s.length < 120) {
    return "Includes ranked tables and country-level figures.";
  }
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen);
  const sp = cut.lastIndexOf(" ");
  return (sp > 40 ? cut.slice(0, sp) : cut).trim() + "…";
}

export function sourceHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Split Tavily fallback / model appendix from the main assistant body. */
export function splitAssistantMainAndWebSources(text: string): { main: string; sourcesBody: string } | null {
  const re = /\n\*\*(?:Sources \(snippets\)|Web sources?)\*\*\s*\n/;
  const m = re.exec(text);
  if (m) {
    return {
      main: text.slice(0, m.index).trimEnd(),
      sourcesBody: text.slice(m.index + m[0].length).trim(),
    };
  }
  const lead = text.trimStart().match(/^\*\*(?:Sources \(snippets\)|Web sources?)\*\*\s*\n?/i);
  if (lead) {
    const t = text.trimStart();
    return { main: "", sourcesBody: t.slice(lead[0].length).trim() };
  }
  return null;
}

export type WebSourceItem =
  | { type: "link"; title: string; url: string; summary: string }
  | { type: "fallback"; line: string };

/**
 * Parse lines under **Web source(s)** / **Sources (snippets)** — markdown `- [t](u) — blurb` or legacy Tavily bullets.
 */
export function parseWebSourcesBody(sourcesBody: string): WebSourceItem[] {
  const lines = sourcesBody.split(/\r?\n/);
  const out: WebSourceItem[] = [];
  for (let line of lines) {
    line = line.trim();
    if (!line || /^\*\*.+\*\*$/.test(line)) continue;

    const md = line.match(/^- \[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*(.*)$/);
    if (md) {
      const rest = (md[3] ?? "").trim();
      const summary = rest.replace(/^[—–-]\s*/, "").trim();
      const blurb = summary ? highLevelFromSnippet(summary) || summary : "";
      out.push({
        type: "link",
        title: md[1]!.trim(),
        url: md[2]!,
        summary: blurb || "Article from live web search — open link for full context.",
      });
      continue;
    }

    const legacy = line.match(
      /^- (.+) \((https?:\/\/[^)]+)\)(?: · published\/updated:\s*([^\n:]+))?: (.+)$/
    );
    if (legacy) {
      out.push({
        type: "link",
        title: legacy[1]!.trim(),
        url: legacy[2]!,
        summary: highLevelFromSnippet(legacy[4]!.trim()) || "Supporting reference from live web search.",
      });
      continue;
    }

    if (line.startsWith("- ")) {
      out.push({ type: "fallback", line: line.slice(2).trim() });
    }
  }
  return out;
}
