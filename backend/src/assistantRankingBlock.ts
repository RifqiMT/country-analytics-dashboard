import { METRIC_BY_ID } from "./metrics.js";
import { fetchGlobalSnapshotWithYearFallback, type GlobalRow } from "./globalSnapshot.js";
import { listCountries } from "./restCountries.js";
import { currentDataYear } from "./yearBounds.js";

const MAX_RANK = 100;
const MIN_RANK = 3;

const WORD_TO_N: Record<string, number> = {
  three: 3,
  five: 5,
  seven: 7,
  ten: 10,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  hundred: 100,
};

function parseRankCount(ql: string): number {
  const digit = ql.match(/\b(?:top|bottom|first)\s+(\d{1,3})\b/i);
  if (digit) {
    const n = parseInt(digit[1]!, 10);
    if (Number.isFinite(n)) return Math.min(MAX_RANK, Math.max(MIN_RANK, n));
  }
  const word = ql.match(/\b(?:top|bottom|first)\s+([a-z]+)\b/i);
  if (word) {
    const w = word[1]!.toLowerCase().replace(/\s+/g, "");
    if (w in WORD_TO_N) return Math.min(MAX_RANK, Math.max(MIN_RANK, WORD_TO_N[w]!));
  }
  if (/\btop\s+ten\b/i.test(ql)) return 10;
  if (/\btop\s+five\b/i.test(ql)) return 5;
  if (/\btop\s+twenty\b/i.test(ql)) return 20;
  if (/\btop\s+fifteen\b/i.test(ql)) return 15;
  if (/\btop\s+three\b/i.test(ql)) return 3;
  if (/\btop\s+seven\b/i.test(ql)) return 7;
  if (/\btop\b/i.test(ql)) return 10;
  return 10;
}

function escapeMdCell(s: string): string {
  return s.replace(/\|/g, "·").replace(/\r?\n/g, " ").trim();
}

function inferSortOrder(ql: string): "desc" | "asc" {
  if (
    /\b(lowest|smallest|least|bottom|minimum|min)\b/i.test(ql) &&
    !/\bleast\s+developed\b/i.test(ql)
  ) {
    return "asc";
  }
  return "desc";
}

/** User wants a multi-country rank list from platform data (not a single-country series). */
export function looksLikeGlobalRankingQuery(message: string): boolean {
  const ql = message.toLowerCase();
  const scope =
    /\b(countries|nations|economies|in\s+the\s+world|worldwide|globally|around\s+the\s+world)\b/i.test(
      ql
    ) || /\btop\s+\d+\b/i.test(ql);
  const rankCue =
    /\btop\s+(\d+|ten|five|twenty|fifteen|three|seven)\b/i.test(ql) ||
    /\bbottom\s+(\d+|ten|five)\b/i.test(ql) ||
    /\b(highest|lowest|largest|smallest|biggest|richest|wealthiest|poorest)\b/i.test(ql) ||
    /\bmost\s+populous\b/i.test(ql) ||
    /\b(countries|nations)\s+(by|with)\s+(the\s+)?(highest|lowest|largest|smallest|most|least)\b/i.test(
      ql
    ) ||
    /\brank(ing)?\s+(of\s+)?(countries|nations|economies)\b/i.test(ql);
  const metricHint =
    /\b(gdp|population|inflation|unemployment|debt|growth|per\s+capita|ppp|literacy|life\s+expectancy|poverty)\b/i.test(
      ql
    );
  if (rankCue && (scope || metricHint)) return true;
  if (/\btop\s+\d+\b/i.test(ql) && metricHint) return true;
  return false;
}

function inferRankingMetricId(ql: string): string | null {
  if (/\bgdp\s+per\s+capita\s+ppp\b|\bppp\s+per\s+capita\b/i.test(ql)) return "gdp_per_capita_ppp";
  if (/\bgdp\s+per\s+capita\b|\bper\s+capita\s+gdp\b/i.test(ql)) return "gdp_per_capita";
  if (/\bgdp\s+ppp\b|\bppp\s+gdp\b/i.test(ql)) return "gdp_ppp";
  if (/\bgdp\s+growth\b|\beconomic\s+growth\s+rate\b/i.test(ql)) return "gdp_growth";
  if (/\blargest\s+econom/i.test(ql) || /\bbiggest\s+econom/i.test(ql)) return "gdp";
  if (/\brichest\b|\bwealthiest\b|\bpoorest\b/i.test(ql)) return "gdp_per_capita";
  if (/\bgdp\b|\bgross\s+domestic\b/i.test(ql)) return "gdp";
  if (/\bpopulation\b|\bpopulous\b|\bmost\s+people\b|\bmost\s+humans\b/i.test(ql)) return "population";
  if (/\binflation\b|\bcpi\b/i.test(ql)) return "inflation";
  if (/\bunemployment\b/i.test(ql)) return "unemployment_ilo";
  if (/\b(life\s+expectancy|how\s+long\s+people\s+live)\b/i.test(ql)) return "life_expectancy";
  if (/\bliteracy\b/i.test(ql)) return "literacy_adult";
  if (/\bpoverty\b|\bheadcount\b/i.test(ql)) return "poverty_headcount";
  if (/\b(undernourish|hunger|malnutrition)\b/i.test(ql)) return "undernourishment";
  if (/\b(debt\s*%|debt\s+to\s+gdp|government\s+debt)\b/i.test(ql)) return "gov_debt_pct_gdp";
  if (/\blending\s+rate\b|\binterest\s+rate\b/i.test(ql)) return "lending_rate";
  return null;
}

function filterToRestCountries(rows: GlobalRow[], allowed: Set<string>): GlobalRow[] {
  return rows.filter(
    (r) => allowed.has(r.countryIso3) && r.value !== null && Number.isFinite(r.value as number)
  );
}

export type AssistantRankingPayload = {
  /** Plain-text block for the LLM (same figures as the table). */
  plainBlock: string;
  /** GitHub-flavored markdown table + caption for the user interface. */
  markdownTable: string;
};

function buildRankingMarkdownTable(
  metricId: string,
  label: string,
  dataYear: number,
  order: "desc" | "asc",
  slice: GlobalRow[],
  totalWithData: number,
  formatMetricValue: (metricId: string, value: number) => string
): string {
  const orderLabel = order === "desc" ? "Highest first" : "Lowest first";
  const caption = `**${escapeMdCell(label)}** (${metricId}) · **Reference year:** ${dataYear} · ${orderLabel} · **${slice.length}** countries shown (${totalWithData} with data)`;
  const header = `| Rank | Country | ISO3 | Value |\n| ---: | --- | :---: | --- |`;
  const body = slice
    .map((r, i) => {
      const val = formatMetricValue(metricId, r.value as number);
      return `| ${i + 1} | ${escapeMdCell(r.countryName)} | ${r.countryIso3} | ${escapeMdCell(val)} |`;
    })
    .join("\n");
  return `${caption}\n\n${header}\n${body}`;
}

/**
 * Global top/bottom ranking: plain context for the model + a markdown table for the UI.
 */
export async function buildAssistantRankingPayload(
  message: string,
  formatMetricValue: (metricId: string, value: number) => string
): Promise<AssistantRankingPayload | null> {
  const ql = message.toLowerCase();
  if (!looksLikeGlobalRankingQuery(message)) return null;
  const metricId = inferRankingMetricId(ql);
  if (!metricId || !METRIC_BY_ID[metricId]) return null;

  const n = parseRankCount(ql);
  const order = inferSortOrder(ql);
  const requestedYear = currentDataYear();

  const [countries, { dataYear, rows }] = await Promise.all([
    listCountries(),
    fetchGlobalSnapshotWithYearFallback(metricId, requestedYear),
  ]);
  const allowed = new Set(countries.map((c) => c.cca3));
  let candidates = filterToRestCountries(rows, allowed);
  candidates.sort((a, b) =>
    order === "desc" ? (b.value! as number) - (a.value! as number) : (a.value! as number) - (b.value! as number)
  );
  const slice = candidates.slice(0, n);
  if (slice.length === 0) return null;

  const label = METRIC_BY_ID[metricId]!.label;
  const lines: string[] = [
    "GLOBAL CROSS-COUNTRY RANKING (full platform global snapshot — same pipeline as dashboard map/global table)",
    `Metric: ${label} (${metricId})`,
    `Reference year: ${dataYear} (chosen for coverage when latest WDI page is sparse)`,
    `Order: ${order === "desc" ? "highest first" : "lowest first"} · showing ${slice.length} of ${candidates.length} countries with data`,
    "",
  ];
  slice.forEach((r, i) => {
    lines.push(
      `${i + 1}. ${r.countryName} (${r.countryIso3}): ${formatMetricValue(metricId, r.value as number)}`
    );
  });

  const markdownTable = buildRankingMarkdownTable(
    metricId,
    label,
    dataYear,
    order,
    slice,
    candidates.length,
    formatMetricValue
  );

  return { plainBlock: lines.join("\n"), markdownTable };
}
