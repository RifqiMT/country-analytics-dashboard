/**
 * Keeps assistant Groq requests under a safe size so providers rarely reject with
 * context-length / payload errors (especially with large ranking tables + comparisons).
 */

/**
 * Conservative cap for assistant user payload.
 * The previous 52k-char budget could still trigger provider-side token limit
 * errors on smaller/latency-first models (e.g. llama-3.1-8b-instant).
 */
const DEFAULT_MAX_USER_CHARS = 18_000;

/** Match the section headers built in `POST /api/assistant/chat` user template. */
const RANK_HEADER = "## Global ranking snapshot";
const RESEARCH_HEADER = "## Recent research excerpts";
const COMPARE_MARKER = "## Official indicators — comparison set";

function truncateRankingBody(body: string, maxLines: number): string {
  const lines = body.split(/\r?\n/);
  if (lines.length <= maxLines) return body;
  const head = lines.slice(0, maxLines).join("\n");
  return `${head}\n\n[Server: ${lines.length - maxLines} more ranking lines omitted—full table may appear above this message in the app.]`;
}

function shrinkComparisonToFit(
  out: string,
  budget: number,
  rankStart: number
): string {
  const cIdx = out.indexOf(COMPARE_MARKER);
  if (cIdx < 0 || rankStart <= cIdx || out.length <= budget) return out;
  const compSection = out.slice(cIdx, rankStart);
  const excess = out.length - budget;
  const target = Math.max(2_500, compSection.length - excess - 400);
  if (target >= compSection.length - 80) return out;
  const shortened =
    compSection.slice(0, target) +
    "\n\n[Server: Comparison block truncated; open the platform comparison view for the full set.]\n";
  return out.slice(0, cIdx) + shortened + out.slice(rankStart);
}

/**
 * If the user prompt exceeds `maxChars`, shrink the global ranking block first (largest),
 * then the comparison block, then hard-cap—preserving the start of the prompt (question + focus snapshot).
 */
export function clampAssistantUserForLlm(user: string, maxChars = DEFAULT_MAX_USER_CHARS): string {
  if (user.length <= maxChars) return user;

  const note =
    "\n\n[Server: Context was trimmed to fit the language model. Prefer figures from prepended platform tables when shown.]\n";
  const budget = maxChars - note.length;

  const rIdx = user.indexOf(RANK_HEADER);
  if (rIdx < 0) {
    return user.slice(0, Math.max(0, budget)) + note;
  }

  const beforeRank = user.slice(0, rIdx);
  const fromRank = user.slice(rIdx);
  const eIdx = fromRank.indexOf(RESEARCH_HEADER);
  const rankPart = eIdx >= 0 ? fromRank.slice(0, eIdx) : fromRank;
  const afterRank = eIdx >= 0 ? fromRank.slice(eIdx) : "";

  let rankBody = rankPart;
  for (const cap of [120, 80, 50, 30]) {
    const trimmed = truncateRankingBody(rankPart, cap);
    const candidate = beforeRank + trimmed + afterRank;
    if (candidate.length <= budget) {
      rankBody = trimmed;
      break;
    }
    rankBody = trimmed;
  }

  let out = beforeRank + rankBody + afterRank;
  const rankStart = out.indexOf(RANK_HEADER);
  if (out.length > budget && rankStart >= 0) {
    out = shrinkComparisonToFit(out, budget, rankStart);
  }

  if (out.length > budget) {
    out = out.slice(0, budget);
  }
  return out + note;
}
