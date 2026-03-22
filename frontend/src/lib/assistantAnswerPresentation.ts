import type { AssistantMessageCitations } from "../components/assistant/MessageContent";

export type AssistantAnswerPresentation = {
  /** Stable id for styling/tests */
  categoryId: string;
  /** Short label for UI chip — reflects source mix */
  categoryLabel: string;
  personaName: string;
  personaTitle: string;
  /** One line: how this voice relates to the sources used */
  personaDescription: string;
};

const PRESENTATIONS: Record<string, Omit<AssistantAnswerPresentation, "categoryId">> = {
  resilience_brief: {
    categoryLabel: "Platform + web (resilience path)",
    personaName: "James Halloway",
    personaTitle: "Research resilience lead",
    personaDescription:
      "When the narrative model path is unavailable, surfaces curated database figures and one vetted web excerpt so you still get a grounded brief.",
  },
  verified_current_affairs: {
    categoryLabel: "Live web verification",
    personaName: "Sofia Reyes",
    personaTitle: "Current-affairs verification analyst",
    personaDescription:
      "Prioritizes fresh, dated reporting and official sources for leadership, elections, and fast-moving events—without treating dashboard series as headlines.",
  },
  cross_country_compare: {
    categoryLabel: "Multi-country platform series",
    personaName: "Priya Raman",
    personaTitle: "Comparative development analyst",
    personaDescription:
      "Keeps side-by-side numeric contrasts tied to each economy’s labeled snapshot lines and data years—no cross-contamination between countries.",
  },
  global_benchmarks: {
    categoryLabel: "Global ranking snapshot",
    personaName: "Daniel Okoro",
    personaTitle: "Global benchmarks lead",
    personaDescription:
      "Frames leaderboards and rank-order stories against the same snapshot year and methodology as the platform’s global tables.",
  },
  data_web_integrated: {
    categoryLabel: "Curated data + live web",
    personaName: "Marcus Lindholm",
    personaTitle: "Integrated macro & news analyst",
    personaDescription:
      "Combines WDI-aligned indicators with live web context only where it genuinely supports the question—citations show which is which.",
  },
  curated_platform: {
    categoryLabel: "Platform database / API",
    personaName: "Dr. Elena Marchetti",
    personaTitle: "Lead macro data economist",
    personaDescription:
      "Speaks strictly from the app’s ingested series when web retrieval is skipped or unnecessary—precise, efficient, and audit-friendly.",
  },
  web_first_context: {
    categoryLabel: "Web context (metrics off-scope)",
    personaName: "Amélie Durand",
    personaTitle: "Regional context specialist",
    personaDescription:
      "For questions outside the dashboard metric scope, answers from web excerpts and proportionate general knowledge without padding unrelated macro stats.",
  },
  balanced_analyst: {
    categoryLabel: "Balanced synthesis",
    personaName: "Dr. Kwame Asante",
    personaTitle: "Country intelligence partner",
    personaDescription:
      "Balances database discipline with clear colleague-ready prose whenever routing sits between strict platform-only and full web-first modes.",
  },
};

function countCiteKeys(c: AssistantMessageCitations | undefined): { d: number; w: number } {
  if (!c) return { d: 0, w: 0 };
  return { d: Object.keys(c.D).length, w: Object.keys(c.W).length };
}

/**
 * Derive a user-visible **source category** and **answer persona** from server `attribution` and `citations`.
 */
export function resolveAssistantAnswerPresentation(
  attribution: string[] | undefined,
  citations: AssistantMessageCitations | undefined
): AssistantAnswerPresentation {
  const lines = attribution ?? [];
  const intent = lines.find((l) => l.startsWith("Intent:")) ?? "";
  const intentLower = intent.toLowerCase();

  const { d: dCount, w: wCount } = countCiteKeys(citations);

  const groqExhausted = lines.some((l) => l.startsWith("LLM: Groq exhausted"));
  const tavilyFallback = lines.some((l) => l.startsWith("Fallback: Tavily"));
  const webSkipped = lines.some((l) => l.includes("Web: skipped"));
  const webTavily = lines.some((l) => l.startsWith("Web: Tavily"));
  const hasRankingLine = lines.some((l) => l.startsWith("Global ranking"));
  const hasComparisonLine = lines.some((l) => l.startsWith("Comparison:"));
  const platformOmitted = lines.some(
    (l) => l.includes("Platform:") && l.includes("omitted") && l.includes("scope")
  );

  const verifiedIntent =
    intentLower.includes("live web") ||
    intentLower.includes("verified current-affairs") ||
    intentLower.includes("ephemeral facts");

  let categoryId: keyof typeof PRESENTATIONS = "balanced_analyst";

  if (groqExhausted && tavilyFallback) {
    categoryId = "resilience_brief";
  } else if (verifiedIntent && (wCount > 0 || webTavily)) {
    categoryId = "verified_current_affairs";
  } else if (hasComparisonLine && dCount > 0) {
    categoryId = "cross_country_compare";
  } else if (hasRankingLine && dCount > 0) {
    categoryId = "global_benchmarks";
  } else if (dCount > 0 && (wCount > 0 || (webTavily && !webSkipped))) {
    categoryId = "data_web_integrated";
  } else if (dCount > 0 && (webSkipped || !webTavily)) {
    categoryId = "curated_platform";
  } else if (wCount > 0 || (webTavily && dCount === 0) || (platformOmitted && webTavily)) {
    categoryId = "web_first_context";
  }

  const base = PRESENTATIONS[categoryId] ?? PRESENTATIONS.balanced_analyst;
  return { categoryId, ...base };
}
