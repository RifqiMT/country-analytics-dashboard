export type Attribution = {
  sources: string[];
  model?: string;
  webSearchUsed?: boolean;
};

/** Legacy default when no `GROQ_MODEL` / use-case override (e.g. ad-hoc `groqChat` without model). */
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

/** PESTEL / Porter / Assistant use distinct primary + fallback chains by default (see `resolveGroqModelCandidatesForUseCase`). */
export type GroqUseCase = "pestel" | "porter" | "assistant";

const USE_CASE_DEFAULT_PRIMARY: Record<GroqUseCase, string> = {
  /** Long structured JSON + multi-section narrative */
  pestel: "llama-3.3-70b-versatile",
  /** Industry / competitive framing; distinct from PESTEL primary (see Groq deprecations for current ids). */
  porter: "openai/gpt-oss-120b",
  /** Interactive chat: latency-first, then scale up on retry */
  assistant: "llama-3.1-8b-instant",
};

const USE_CASE_BUILTIN_FALLBACKS: Record<GroqUseCase, readonly string[]> = {
  pestel: ["llama-3.1-8b-instant", "openai/gpt-oss-120b", "qwen/qwen3-32b"],
  porter: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3-32b"],
  assistant: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "qwen/qwen3-32b"],
};

function trimEnv(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v && v.length > 0 ? v : undefined;
}

function parseModelList(raw: string | undefined): string[] {
  return raw?.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean) ?? [];
}

/** Primary model for a feature: `GROQ_MODEL_<USECASE>` → `GROQ_MODEL` (legacy) → built-in default for that use case. */
export function resolveGroqModelPrimaryForUseCase(useCase: GroqUseCase): string {
  const envKey =
    useCase === "pestel"
      ? "GROQ_MODEL_PESTEL"
      : useCase === "porter"
        ? "GROQ_MODEL_PORTER"
        : "GROQ_MODEL_ASSISTANT";
  return trimEnv(envKey) ?? trimEnv("GROQ_MODEL") ?? USE_CASE_DEFAULT_PRIMARY[useCase];
}

/**
 * Ordered model ids for Groq retries: primary → per-use-case fallbacks → global `GROQ_FALLBACK_MODELS` → built-ins for that use case.
 */
export function resolveGroqModelCandidatesForUseCase(useCase: GroqUseCase): string[] {
  const primary = resolveGroqModelPrimaryForUseCase(useCase);
  const fallbacksEnvKey =
    useCase === "pestel"
      ? "GROQ_FALLBACK_MODELS_PESTEL"
      : useCase === "porter"
        ? "GROQ_FALLBACK_MODELS_PORTER"
        : "GROQ_FALLBACK_MODELS_ASSISTANT";
  const fromUseCase = parseModelList(process.env[fallbacksEnvKey]);
  const fromGlobal = parseModelList(process.env.GROQ_FALLBACK_MODELS);
  const builtIns = [...USE_CASE_BUILTIN_FALLBACKS[useCase]];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [primary, ...fromUseCase, ...fromGlobal, ...builtIns]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** @deprecated Prefer `resolveGroqModelPrimaryForUseCase` or use-case candidates. Legacy: `GROQ_MODEL` or default 70B. */
export function resolveGroqModel(): string {
  const raw = process.env.GROQ_MODEL?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_GROQ_MODEL;
}

function groqErrorMessage(status: number, bodyText: string): string {
  const trimmed = bodyText.trim();
  try {
    const j = JSON.parse(trimmed) as { error?: { message?: string } };
    const m = j?.error?.message;
    if (typeof m === "string" && m.length > 0) return m;
  } catch {
    /* use raw */
  }
  return trimmed || `HTTP ${status}`;
}

/**
 * Whether to try the next Groq model in the chain (or Tavily elsewhere).
 * Includes transient HTTP errors and 400s that indicate a bad/removed model id so env misconfig does not abort before later candidates.
 */
export function groqFailureIsRetryable(status: number, errMessage?: string): boolean {
  if ([408, 429, 500, 502, 503, 529].includes(status)) return true;
  if (status === 400 && errMessage) {
    const m = errMessage.toLowerCase();
    if (
      m.includes("decommissioned") ||
      m.includes("no longer supported") ||
      m.includes("invalid model") ||
      m.includes("model_not_found") ||
      m.includes("does not exist") ||
      m.includes("unknown model")
    ) {
      return true;
    }
  }
  return false;
}

export function parseGroqErrorStatus(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/^Groq \((\d+)\):/);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Legacy candidate list (Assistant-oriented). Prefer `resolveGroqModelCandidatesForUseCase("assistant")` in new code.
 */
export function resolveGroqModelCandidates(): string[] {
  return resolveGroqModelCandidatesForUseCase("assistant");
}

export type TavilyTimeRange = "day" | "week" | "month" | "year";

export type TavilySearchOptions = {
  maxResults?: number;
  /** Default `advanced` for richer snippets (higher relevance; more API credits). */
  searchDepth?: "basic" | "advanced" | "fast" | "ultra-fast";
  /** `news` biases toward recent articles when supported by the API. */
  topic?: "general" | "news" | "finance";
  /**
   * Filter to sources published/updated within this window (Tavily `time_range`).
   * Pair with `startDate` for a hard floor on stale pages.
   */
  timeRange?: TavilyTimeRange | null;
  /** Inclusive YYYY-MM-DD (Tavily `start_date`) — strongest lever against outdated hits. */
  startDate?: string;
  /** YYYY-MM-DD upper bound (Tavily `end_date`), usually today. */
  endDate?: string;
  /** Ask Tavily for a short synthesized answer — boolean or `advanced` for a longer answer. */
  includeAnswer?: boolean | "basic" | "advanced";
  /** Sort hits by `published_date` when the API returns it (default true). */
  preferNewestSourcesFirst?: boolean;
};

/** Today as YYYY-MM-DD (UTC). */
export function utcDateISO(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Calendar date N days ago (UTC), YYYY-MM-DD. */
export function utcDateDaysAgo(days: number, from = new Date()): string {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Appended to system prompts so the model weights retrieval over stale parametric knowledge. */
export function analyticsRecencySystemSuffix(): string {
  const iso = new Date().toISOString().slice(0, 10);
  return `CURRENTNESS: The real-world calendar date is ${iso}. Web excerpts in the user message are from a **live search** filtered for recency—treat them as the freshest evidence in the thread. For **who holds office** (president, PM, monarch), **election winners**, policy, and markets, prefer those excerpts (and any dates or years they cite) over model cutoff knowledge. If excerpts conflict with older training data, trust the excerpts. Do not “correct” fresh web material with stale parametric facts. If the user asks who currently leads a country and excerpts are absent or empty, do not substitute a name from training data.`;
}

export type TavilySearchMeta = {
  formattedBlock: string;
  synthesizedAnswer: string | null;
};

export async function tavilySearchWithMeta(
  query: string,
  maxResults = 5,
  options?: TavilySearchOptions
): Promise<TavilySearchMeta> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return { formattedBlock: "", synthesizedAnswer: null };
  const max_results = options?.maxResults ?? maxResults;
  const body: Record<string, unknown> = {
    api_key: key,
    query,
    search_depth: options?.searchDepth ?? "advanced",
    max_results,
    topic: options?.topic ?? "general",
    include_answer: options?.includeAnswer ?? true,
    chunks_per_source: 3,
  };
  if (options?.timeRange) body.time_range = options.timeRange;
  if (options?.startDate) body.start_date = options.startDate;
  if (options?.endDate) body.end_date = options.endDate;

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { formattedBlock: "", synthesizedAnswer: null };
  const data = (await res.json()) as {
    answer?: string;
    results?: {
      title?: string;
      url?: string;
      content?: string;
      published_date?: string;
    }[];
  };
  const synth =
    typeof data.answer === "string" && data.answer.trim() ? data.answer.trim() : null;
  const chunks: string[] = [];
  if (options?.startDate) {
    chunks.push(
      `[Retrieval window: sources on or after ${options.startDate}${options.endDate ? ` through ${options.endDate}` : ""} where indexed dates exist]`
    );
  }
  if (synth) {
    chunks.push(`Brief synthesis (search-generated, prefer for “what’s current”): ${synth}`);
  }
  let rows = data.results ?? [];
  if (options?.preferNewestSourcesFirst !== false && rows.length > 1) {
    rows = [...rows].sort((a, b) => {
      const ta = a.published_date ? Date.parse(a.published_date) : NaN;
      const tb = b.published_date ? Date.parse(b.published_date) : NaN;
      if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
      if (!Number.isFinite(ta)) return 1;
      if (!Number.isFinite(tb)) return -1;
      return tb - ta;
    });
  }
  const parts = rows.map((r) => {
    const when =
      r.published_date && String(r.published_date).trim()
        ? ` · published/updated: ${String(r.published_date).trim()}`
        : "";
    return `- ${r.title ?? ""} (${r.url ?? ""})${when}: ${r.content ?? ""}`;
  });
  if (parts.length) chunks.push(...parts);
  return { formattedBlock: chunks.join("\n"), synthesizedAnswer: synth };
}

export async function tavilySearch(
  query: string,
  maxResults = 5,
  options?: TavilySearchOptions
): Promise<string> {
  const { formattedBlock } = await tavilySearchWithMeta(query, maxResults, options);
  return formattedBlock;
}

/**
 * When Groq is exhausted, run a fresh Tavily query and format a short assistant-style reply from synthesis + top sources.
 */
export async function tavilyAssistantFallbackReply(userQuestion: string): Promise<{
  text: string;
  hasSynthesis: boolean;
}> {
  const q = `${userQuestion.trim()}\n\nAnswer concisely with current facts; cite themes suitable for a country analytics assistant.`;
  const meta = await tavilySearchWithMeta(q, 10, {
    searchDepth: "advanced",
    includeAnswer: "advanced",
    topic: "general",
    timeRange: "month",
    preferNewestSourcesFirst: true,
  });
  if (!meta.formattedBlock.trim() && !meta.synthesizedAnswer) {
    return {
      text: "Live web search did not return usable results, and the language model is temporarily unavailable. Please try again shortly or check your API quotas (Groq / Tavily).",
      hasSynthesis: false,
    };
  }
  const lines: string[] = [];
  lines.push(
    "**Note:** Primary language model was unavailable (e.g. rate limit). Below is a **Tavily** web synthesis and excerpts—verify critical facts on the linked sources."
  );
  lines.push("");
  if (meta.synthesizedAnswer) {
    lines.push(meta.synthesizedAnswer);
    lines.push("");
  }
  const bullets = meta.formattedBlock
    .split("\n")
    .filter((l) => l.trim().startsWith("- ") && l.includes("http"));
  const top = bullets.slice(0, 5);
  if (top.length) {
    lines.push("**Sources (snippets)**");
    lines.push(...top);
  } else if (!meta.synthesizedAnswer) {
    lines.push(meta.formattedBlock.slice(0, 4000));
  }
  return { text: lines.join("\n").trim(), hasSynthesis: Boolean(meta.synthesizedAnswer) };
}

export async function groqChat(
  system: string,
  user: string,
  options?: {
    jsonObject?: boolean;
    temperature?: number;
    /** Nucleus sampling; lower = more deterministic (e.g. 0.9 for structured JSON). Default 1. */
    topP?: number;
    analyticsRecencyHint?: boolean;
    /** Override resolved primary model (used by fallback chain). */
    model?: string;
  }
): Promise<{ text: string; model: string }> {
  const key = process.env.GROQ_API_KEY;
  const model =
    options?.model?.trim() && options.model.trim().length > 0
      ? options.model.trim()
      : resolveGroqModel();
  if (!key) throw new Error("GROQ_API_KEY not set");
  const temperature =
    typeof options?.temperature === "number" && Number.isFinite(options.temperature)
      ? Math.min(1.5, Math.max(0, options.temperature))
      : 0.4;
  const systemContent =
    options?.analyticsRecencyHint === true ? `${system}\n\n${analyticsRecencySystemSuffix()}` : system;
  const topP =
    typeof options?.topP === "number" && Number.isFinite(options.topP)
      ? Math.min(1, Math.max(0.01, options.topP))
      : 1;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: user },
      ],
      temperature,
      top_p: topP,
      max_tokens: 8192,
      ...(options?.jsonObject ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    const detail = groqErrorMessage(res.status, body);
    throw new Error(`Groq (${res.status}): ${detail}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  return { text, model };
}

/**
 * Try primary + fallback Groq models for a specific product surface (PESTEL vs Porter vs Assistant each has its own stack).
 * Per-use-case env: `GROQ_MODEL_PESTEL`, `GROQ_MODEL_PORTER`, `GROQ_MODEL_ASSISTANT` and matching `GROQ_FALLBACK_MODELS_*`.
 * If unset, `GROQ_MODEL` / `GROQ_FALLBACK_MODELS` apply, then built-in defaults differ by use case.
 */
export async function groqChatWithFallbackForUseCase(
  useCase: GroqUseCase,
  system: string,
  user: string,
  options?: { jsonObject?: boolean; temperature?: number; topP?: number; analyticsRecencyHint?: boolean }
): Promise<{
  text: string;
  model: string;
  triedModels: string[];
  primaryFailed: boolean;
  useCase: GroqUseCase;
}> {
  const candidates = resolveGroqModelCandidatesForUseCase(useCase);
  const tried: string[] = [];
  let lastErr: Error | null = null;
  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i]!;
    tried.push(model);
    try {
      const r = await groqChat(system, user, { ...options, model });
      return {
        text: r.text,
        model: r.model,
        triedModels: tried,
        primaryFailed: i > 0,
        useCase,
      };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const st = parseGroqErrorStatus(lastErr);
      const retry = st !== null && groqFailureIsRetryable(st, lastErr.message);
      if (!retry || i === candidates.length - 1) {
        throw lastErr;
      }
    }
  }
  throw lastErr ?? new Error("Groq: no models to try");
}

/** @deprecated Use `groqChatWithFallbackForUseCase("assistant", ...)` for explicit routing. Alias: Assistant stack. */
export async function groqChatWithFallback(
  system: string,
  user: string,
  options?: { jsonObject?: boolean; temperature?: number; topP?: number; analyticsRecencyHint?: boolean }
): Promise<{ text: string; model: string; triedModels: string[]; primaryFailed: boolean }> {
  const r = await groqChatWithFallbackForUseCase("assistant", system, user, options);
  return {
    text: r.text,
    model: r.model,
    triedModels: r.triedModels,
    primaryFailed: r.primaryFailed,
  };
}
