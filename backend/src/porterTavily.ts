import { tavilySearchWithMeta, utcDateDaysAgo, utcDateISO } from "./llm.js";

/** Publication windows (Tavily start_date / end_date, UTC). Labels are for model routing—output prose must not copy them verbatim. */
const TEMPORAL_WINDOWS: { label: string; days: number; topic: "general" | "news" }[] = [
  { label: "Very recent (~1 week)", days: 7, topic: "news" },
  { label: "Recent month", days: 30, topic: "news" },
  { label: "Half-year lens", days: 180, topic: "general" },
  { label: "Annual lens", days: 365, topic: "general" },
  { label: "Five-year lens", days: 1825, topic: "general" },
];

export const PORTER_TEMPORAL_SECTION_MARKER = "## Multi-horizon Porter industry research";

/**
 * Parallel Tavily searches over 7d / 30d / 180d / 365d / 5y windows for Porter (country + ISIC sector).
 */
export async function fetchPorterTemporalHorizonWeb(
  countryName: string,
  cca3: string,
  industrySector: string,
  year: number,
  tavilyApiKey?: string
): Promise<string> {
  if (!(tavilyApiKey?.trim() || process.env.TAVILY_API_KEY?.trim())) return "";
  const today = utcDateISO();
  const y = String(year);
  const calY = String(new Date().getUTCFullYear());
  const baseQ = `${countryName} (${cca3}) ${industrySector} Porter five forces industry analysis: competitive rivalry market structure consolidation M&A; barriers to entry regulation FDI licensing; supplier power input costs commodities supply chain; buyer power retail channels consumers pricing; threat of substitutes innovation imports alternatives. Context ${y} ${calY}.`;

  const rows = await Promise.all(
    TEMPORAL_WINDOWS.map(async ({ label, days, topic }) => {
      const start = utcDateDaysAgo(days);
      const meta = await tavilySearchWithMeta(baseQ, 4, {
        searchDepth: "advanced",
        includeAnswer: "advanced",
        topic,
        startDate: start,
        endDate: today,
        preferNewestSourcesFirst: true,
        apiKey: tavilyApiKey,
      });
      const inner = [
        meta.synthesizedAnswer?.trim() ? `**Synthesis:** ${meta.synthesizedAnswer.trim()}` : "",
        meta.formattedBlock.trim(),
      ]
        .filter(Boolean)
        .join("\n\n");
      const clipped = inner.slice(0, 2000);
      const header = `### ${label} (indexed ~${start}–${today})`;
      if (!clipped.trim()) {
        return `${header}\n[Model note: thin hits for this slice—use other excerpts or platform indicators.]`;
      }
      return `${header}\n${clipped}`;
    })
  );

  return [PORTER_TEMPORAL_SECTION_MARKER, ...rows].join("\n\n");
}
