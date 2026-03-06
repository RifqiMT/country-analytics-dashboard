/**
 * Vite plugin that adds a /api/chat endpoint for LLM chat.
 * Supports OpenAI, Groq, Anthropic, Google, OpenRouter.
 * Falls back to rule-based responses when no API key is set.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { config as loadDotenv } from 'dotenv';

// Load .env early from plugin dir (project root) – configResolved will re-load from config.root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.join(__dirname, '.env') });
import {
  getFallbackResponse,
  FALLBACK_GENERIC_HELP_MARKER,
  type DashboardSnapshotForFallback,
  type GlobalCountryRowForFallback,
} from './src/utils/chatFallback';
import { DATA_MAX_YEAR } from './src/config';
import {
  LLM_MODELS,
  DEFAULT_LLM_MODEL,
  getProviderForModel,
  getModelById,
  PROVIDER_ENV_KEYS,
  type LlmProvider,
} from './src/config/llm';

const SOURCE_FALLBACK = 'Dashboard data';

function getModelLabel(modelId: string): string {
  return getModelById(modelId)?.label ?? modelId;
}

/** Extract country name from query for Wikipedia link (e.g. "who is the president of Indonesia?" → "Indonesia"). */
function extractCountryForWiki(query: string): string {
  const q = (query ?? '').trim();
  const ofMatch = q.match(/(?:president|leader|capital|independence|day)\s+of\s+([A-Za-z][A-Za-z\s]+?)(?:\s+now|\s*[?!.]?\s*$)/i)
    || q.match(/(?:of|in)\s+([A-Za-z][A-Za-z\s]+?)(?:\s+now|\s*[?!.]?\s*$)/i);
  if (ofMatch?.[1]) return ofMatch[1].trim();
  const lastWord = q.match(/([A-Za-z][a-z]+)\s*[?!.]?\s*$/);
  return lastWord?.[1] ?? 'country';
}

const SETUP_HINT = `

---
_To answer general questions (e.g. "who is the president of X"), add the required server env key to your \`.env\` file. Obtain keys from each provider's developer console. Then restart the dev server._`;

/** Queries the rule-based fallback cannot answer – use free LLM instead. */
const OUT_OF_SCOPE_PATTERNS = [
  // Leaders & government
  /who\s+is\s+(?:the\s+)?(?:president|prime\s+minister|leader|king|queen|head\s+of\s+state|ruler)/i,
  /president\s+of|prime\s+minister\s+of|leader\s+of|capital\s+of/i,
  /current\s+(?:president|leader|prime\s+minister)/i,
  /government\s+of\s+\w+|history\s+of/i,
  // Geography & place (non-metric) – avoid returning dashboard metrics for location or neighbours questions
  /where\s+is\s+.+\s+located/i,
  /where\s+\w+\s+is\s+located/i,
  /where\s+is\s+.+$/i,
  /location\s+of\s+/i,
  /(?:in\s+)?which\s+continent|which\s+continent\s+is/i,
  /neighbor(?:ing)?\s+countries?\s+(?:of|around)\s+\w+/i,
  /which\s+countries\s+border\s+\w+/i,
  /borders?\s+(?:with|of)\s+\w+/i,
  /what\s+is\s+(?:the\s+)?(?:capital|currency)\s+of/i,
  /when\s+did\s+|when\s+was\s+|when\s+is\s+/i,
  // Independence & founding
  /(?:independence|national)\s+day\s+(?:of|for)?/i,
  /when\s+is\s+(?:the\s+)?(?:independence|national)\s+day/i,
  /when\s+did\s+.+\s+(?:gain|declare|get)\s+independence/i,
  /(?:founding|founded)\s+of|when\s+was\s+.+\s+founded/i,
  // Language
  /(?:what\s+is\s+(?:the\s+)?(?:language|languages)|(?:language|languages)\s+of|what\s+language|official\s+language|spoken\s+language)/i,
  // Culture, religion, society
  /\b(?:religion|religions|relgiions)\b/i,
  /(?:religion|religions)\s+(?:in|of)\s+/i,
  /(?:all|list|give)\s+(?:me\s+)?(?:the\s+)?(?:all\s+)?(?:religion|religions)/i,
  /(?:culture|cultural)\s+of|what\s+is\s+the\s+culture/i,
  /(?:food|cuisine)\s+of|what\s+food|traditional\s+food/i,
  /(?:climate|weather)\s+(?:of|in)|what\s+is\s+the\s+climate/i,
  /(?:holidays?|festivals?)\s+(?:in|of)|national\s+holiday/i,
  /(?:sports?|sport)\s+(?:in|of)|popular\s+sports/i,
  // National symbols
  /(?:flag|anthem)\s+of|national\s+(?:flag|anthem)/i,
  // Other common out-of-scope
  /(?:timezone|time\s+zone)\s+of|what\s+time\s+is\s+it\s+in/i,
  /(?:dialing\s+code|phone\s+code|country\s+code)\s+for/i,
  /(?:visa|visa\s+requirement)\s+for/i,
  /(?:tourism|tourist)\s+(?:in|to)|visit\s+\w+/i,
  /(?:education|school|university)\s+in/i,
  /(?:healthcare|health\s+system)\s+in/i,
  /(?:economy|economic)\s+overview|economic\s+situation/i,
];

// Location / geography queries that should NEVER be answered with dashboard metrics
const LOCATION_QUERY_PATTERN =
  /\bwhere\s+.+\s+located\b|location\s+of\s+|which\s+continent\b|where\s+is\b|neighbor(?:ing)?\s+countries?\s+(?:of|around)\s+\w+|which\s+countries\s+border\s+\w+|borders?\s+(?:with|of)\s+\w+/i;

const LOCATION_FALLBACK_MESSAGE =
  'I can help with **all metrics in this dashboard**: GDP (nominal, PPP, per capita), inflation, government debt, interest rate, unemployment (rate and number), labour force, poverty ($2.15/day and national line), population (total and age groups 0–14, 15–64, 65+), life expectancy, maternal mortality, under-5 mortality, undernourishment, land/total area, EEZ, region, and government type. Ask for a country by name, "Top N by [metric]", or "compare X and Y". For questions about **location or geography** (e.g. where a country is located, which continent, who its neighbouring countries are), use the LLM or web search. For full conversational answers, add your API key in Settings.';

/** In-scope terms – if query is ONLY about these, use fallback. If mixed or absent, check out-of-scope. */
const IN_SCOPE_TERMS = /\b(gdp|population|inflation|debt|life\s+expectancy|area|eez|ranking|compare|top\s+\d+|metric|data\s+source|methodology|how\s+is\s+\w+\s+calculated|world\s+bank|imf)\b/i;

function isGeneralKnowledgeQuery(content: string): boolean {
  const q = (content ?? '').trim();
  if (q.length < 6) return false;
  if (OUT_OF_SCOPE_PATTERNS.some((p) => p.test(q))) return true;
  const looksLikeMetricQuestion = IN_SCOPE_TERMS.test(q) ||
    /^(?:what|how|show|give|list|compare|top|ranking)/i.test(q) && /gdp|pop|inflation|debt|metric|data|ranking|compare|top/i.test(q);
  if (looksLikeMetricQuestion) return false;
  if (/^what\s+is\s+(?:the\s+)?\w+\s+of\b/i.test(q) && !IN_SCOPE_TERMS.test(q)) return true;
  return false;
}

/** Cutoff year: questions about this year or earlier use Groq; after this use Tavily. */
const DATA_CUTOFF_YEAR = new Date().getFullYear() - 2;

/**
 * Extract implied year from query. Returns null if no year detected.
 * "now", "current", "today" → current year.
 * Explicit years like "2026", "in 2024" → that year.
 */
function getImpliedYearFromQuery(content: string): number | null {
  const q = (content ?? '').trim();
  if (/\b(?:now|current|today)\b/i.test(q)) return new Date().getFullYear();
  const yearMatch = q.match(/\b(20[0-2][0-9])\b/);
  return yearMatch ? parseInt(yearMatch[1], 10) : null;
}

/**
 * True if query implies a period after current year minus 2 → use Tavily (real-time).
 * False if year <= cutoff or explicit old year → use Groq.
 */
function isQueryAfterCutoffYear(content: string): boolean {
  const year = getImpliedYearFromQuery(content);
  if (year === null) return true; // no year → assume "now" → Tavily
  return year > DATA_CUTOFF_YEAR;
}

type ChatMessage = { role: string; content: string };

function readJsonBody(req: import('http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const PLACEHOLDER_PATTERNS = /^(gsk_your|sk-your|sk-ant-your|your-google|sk-or-your|your_key_here|your-key-here|placeholder|your-serper|serper-your)/i;
let isDevMode = true;

function getServerApiKey(provider: LlmProvider): string | undefined {
  const key = PROVIDER_ENV_KEYS[provider].server;
  const val = process.env[key];
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed || PLACEHOLDER_PATTERNS.test(trimmed)) return undefined;
  return trimmed;
}

interface TavilySearchResult {
  answer?: string;
  results?: Array<{ title?: string; url?: string; content?: string }>;
}

interface SerperSearchResult {
  organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  news?: Array<{ title?: string; url?: string; content?: string }>;
  knowledgeGraph?: { title?: string; description?: string };
}

/**
 * Fetch supplemental web data for PESTEL analysis (dimensions with limited dashboard data).
 * Runs targeted searches for technology, legal, environmental, and political context.
 */
async function fetchPestelSupplementWebSearch(
  countryName: string,
  year: number,
): Promise<string | null> {
  const queries: Array<{ q: string; section: string }> = [
    { q: `${countryName} technology digital infrastructure policy ${year}`, section: 'Technological' },
    { q: `${countryName} rule of law legal environment business regulation ${year}`, section: 'Legal' },
    { q: `${countryName} political stability government environment ${year}`, section: 'Political' },
    { q: `${countryName} climate environmental policy sustainability ${year}`, section: 'Environmental' },
  ];
  const results = await Promise.all(
    queries.map(({ q }) => fetchWebSearch(q)),
  );
  const parts: string[] = [];
  results.forEach((result, i) => {
    if (result?.context) {
      parts.push(`### ${queries[i].section} (web supplement)\n${result.context}`);
    }
  });
  if (parts.length === 0) return null;
  return `## Supplemental web data for PESTEL (use to enrich dimensions with limited dashboard data)\n\nUse the following real-time web search results to enrich your analysis for Technological, Legal, Political, and Environmental dimensions. Prioritise this data over inference when available.\n\n${parts.join('\n\n')}\n\n---`;
}

/** Fetch latest info from web search. Tries Tavily first, then Serper. Returns { context, directAnswer } or null. */
async function fetchWebSearch(query: string): Promise<{ context: string; directAnswer?: string } | null> {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const serperKey = process.env.SERPER_API_KEY?.trim();
  const hasTavily = tavilyKey && !tavilyKey.startsWith('tvly-your') && !PLACEHOLDER_PATTERNS.test(tavilyKey);
  const hasSerper = serperKey && !PLACEHOLDER_PATTERNS.test(serperKey);

  if (hasTavily) {
    const result = await fetchTavilySearch(query);
    if (result) return result;
  }

  if (hasSerper) {
    const result = await fetchSerperSearch(query);
    if (result) return result;
  }

  return null;
}

async function fetchTavilySearch(query: string): Promise<{ context: string; directAnswer?: string } | null> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key || key.startsWith('tvly-your') || PLACEHOLDER_PATTERNS.test(key)) return null;
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        query,
        max_results: 5,
        search_depth: 'basic',
        topic: /president|prime minister|leader|election|current|now|202[4-9]/i.test(query) ? 'news' : 'general',
        include_answer: 'basic',
      }),
    });
    if (!res.ok) {
      if (isDevMode) console.warn('[chat-api] Tavily API error:', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = (await res.json()) as TavilySearchResult;
    const results = data?.results ?? [];
    const directAnswer = typeof data?.answer === 'string' && data.answer.trim().length > 20 ? data.answer.trim() : undefined;
    const snippets = results
      .slice(0, 5)
      .map((r) => {
        if (!r.content) return null;
        const title = (r.title ?? 'Source').replace(/\n/g, ' ');
        const url = r.url ?? '';
        const content = r.content.slice(0, 400).replace(/\n/g, ' ');
        return url ? `- **${title}** (${url}): ${content}` : `- **${title}**: ${content}`;
      })
      .filter(Boolean) as string[];
    const context = snippets.length > 0
      ? `## CRITICAL – Latest web search (real-time data, use this over your training):\n${snippets.join('\n\n')}\n\nYou MUST base your answer on the web search results above. Do NOT use outdated training data for current leaders, elections, or events.`
      : null;
    return (context || directAnswer) ? { context: context ?? '', directAnswer } : null;
  } catch (err) {
    if (isDevMode) console.warn('[chat-api] Tavily fetch error:', err);
    return null;
  }
}

async function fetchSerperSearch(query: string): Promise<{ context: string; directAnswer?: string } | null> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key || PLACEHOLDER_PATTERNS.test(key)) return null;
  const isNewsQuery = /president|prime minister|leader|election|current|now|202[4-9]/i.test(query);
  const endpoint = isNewsQuery ? 'https://google.serper.dev/news' : 'https://google.serper.dev/search';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': key,
      },
      body: JSON.stringify({ q: query, num: 5 }),
    });
    if (!res.ok) {
      if (isDevMode) console.warn('[chat-api] Serper API error:', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = (await res.json()) as SerperSearchResult;
    const organic = data?.organic ?? [];
    const news = data?.news ?? [];
    const kg = data?.knowledgeGraph;
    const directAnswer = typeof kg?.description === 'string' && kg.description.length > 20 ? kg.description : undefined;
    const items = news.length > 0
      ? news.map((r) => ({ title: r.title, url: r.url, content: r.content }))
      : organic.map((r) => ({ title: r.title, url: r.link, content: r.snippet }));
    const snippets = items
      .slice(0, 5)
      .map((r) => {
        const title = (r.title ?? 'Source').replace(/\n/g, ' ');
        const url = r.url ?? '';
        const content = (r.content ?? '').slice(0, 400).replace(/\n/g, ' ');
        return content ? (url ? `- **${title}** (${url}): ${content}` : `- **${title}**: ${content}`) : null;
      })
      .filter(Boolean) as string[];
    const context = snippets.length > 0
      ? `## CRITICAL – Latest web search (real-time data, use this over your training):\n${snippets.join('\n\n')}\n\nYou MUST base your answer on the web search results above. Do NOT use outdated training data for current leaders, elections, or events.`
      : null;
    return (context || directAnswer) ? { context: context ?? '', directAnswer } : null;
  } catch (err) {
    if (isDevMode) console.warn('[chat-api] Serper fetch error:', err);
    return null;
  }
}

/** Max chars for system prompt when using Groq free tier. Lower = fewer tokens, fits daily limit. */
const GROQ_SYSTEM_MAX_CHARS = 5500;

/** Smaller Groq model – uses fewer tokens, fallback when 70b hits rate limit. */
const GROQ_SMALL_MODEL = 'llama-3.1-8b-instant';

function trimForGroq(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => {
    if (m.role === 'system' && m.content.length > GROQ_SYSTEM_MAX_CHARS) {
      return { ...m, content: m.content.slice(0, GROQ_SYSTEM_MAX_CHARS) + '\n\n[Context truncated for free tier limits.]' };
    }
    return m;
  });
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate limit|too many requests/i.test(msg);
}

function formatUserFriendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (isRateLimitError(err)) {
    return 'Rate limit reached for the free tier. Please try again later (limits reset daily) or add an API key for another provider (OpenAI, Anthropic, Google) in Settings.';
  }
  return msg.slice(0, 120);
}

/** OpenAI-compatible API (OpenAI, Groq, OpenRouter) */
async function fetchOpenAICompatible(
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText.slice(0, 300)}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? 'No response generated.';
}

/** Anthropic Messages API */
async function fetchAnthropic(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');
  const anthropicMessages = chatMessages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
    content: m.content,
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemMsg?.content ?? undefined,
      messages: anthropicMessages,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText.slice(0, 300)}`);
  }
  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const block = data.content?.find((c) => c.type === 'text');
  return block?.text ?? 'No response generated.';
}

/** Google Gemini generateContent API */
async function fetchGoogle(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const contents = chatMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents: contents.length ? contents : [{ role: 'user', parts: [{ text: 'Hello' }] }],
    generationConfig: { maxOutputTokens: 4096 },
  };
  if (systemMsg?.content) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] } as Record<string, unknown>;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google API error ${response.status}: ${errText.slice(0, 300)}`);
  }
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ?? 'No response generated.';
}

const PROVIDER_URLS: Record<LlmProvider, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  anthropic: '', // uses custom fetchAnthropic
  google: '', // uses custom fetchGoogle
  tavily: '', // web search only – not an LLM
};

/** Validate model ID exists in our list */
function isValidModel(modelId: string): boolean {
  return LLM_MODELS.some((m) => m.id === modelId);
}

/** Treat empty or placeholder LLM output as failure so we can fall back to rule-based. */
function isValidLlmResponse(content: string): boolean {
  const t = (content ?? '').trim();
  if (!t) return false;
  if (/^no response generated\.?$/i.test(t)) return false;
  if (t.length < 10) return false;
  return true;
}

function getRuleBasedFallback(
  messages: ChatMessage[],
  dashboardSnapshot: unknown,
  globalData: unknown,
  globalDataByYear: unknown,
): string {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  let content = getFallbackResponse(
    lastUserMessage?.content ?? '',
    dashboardSnapshot as DashboardSnapshotForFallback | null,
    globalData as GlobalCountryRowForFallback[] | null,
    globalDataByYear as Record<number, GlobalCountryRowForFallback[]> | undefined,
  );
  if (content.includes(FALLBACK_GENERIC_HELP_MARKER)) {
    content += SETUP_HINT;
  }
  return content;
}

/** Free-tier providers to try when rule-based fallback returns generic help. Order: most capable first. */
const FREE_LLM_FALLBACK_PRIORITY: Array<{ provider: LlmProvider; model: string }> = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'google', model: 'gemini-1.5-flash' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct' },
];

/** Get first available API key from free-tier providers (server env only). */
function getFreeLlmFallbackKey(): { provider: LlmProvider; model: string; apiKey: string } | null {
  for (const { provider, model } of FREE_LLM_FALLBACK_PRIORITY) {
    const key = getServerApiKey(provider);
    if (key) return { provider, model, apiKey: key };
  }
  return null;
}

async function handleChatRequest(
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse,
  _next?: () => void,
) {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: 'Method not allowed',
            hint: 'Use POST with messages, systemPrompt, model. Run npm run dev and add required keys to .env.',
          }));
          return;
        }

        try {
          const body = (await readJsonBody(req)) as {
            messages?: ChatMessage[];
            systemPrompt?: string;
            model?: string;
            apiKey?: string;
            supplementWithWebSearch?: boolean;
            dashboardSnapshot?: { countryName: string; year: number; metrics: unknown } | null;
            globalData?: Array<Record<string, unknown>> | null;
            globalDataByYear?: Record<string, Array<Record<string, unknown>>> | null;
          };

          const messages = body?.messages ?? [];
          let systemPrompt = body?.systemPrompt ?? '';
          const supplementWithWebSearch = !!body?.supplementWithWebSearch;
          const modelId = body?.model ?? DEFAULT_LLM_MODEL;
          const model = isValidModel(modelId) ? modelId : DEFAULT_LLM_MODEL;
          const clientApiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : undefined;
          const dashboardSnapshot = body?.dashboardSnapshot ?? null;
          const globalData = body?.globalData ?? null;
          const globalDataByYearRaw = body?.globalDataByYear ?? null;
          let globalDataByYear =
            globalDataByYearRaw &&
            Object.fromEntries(
              Object.entries(globalDataByYearRaw).map(([k, v]) => [
                String(parseInt(k, 10) || k),
                v,
              ]),
            );
          if ((!globalDataByYear || Object.keys(globalDataByYear).length === 0) && Array.isArray(globalData) && globalData.length > 0) {
            globalDataByYear = { [String(DATA_MAX_YEAR)]: globalData };
          }

          const provider = getProviderForModel(model) ?? 'openai';
          const apiKey = clientApiKey ?? getServerApiKey(provider);

          const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
          const userQuery = lastUserMessage?.content ?? '';
          const isLocationQuestion = LOCATION_QUERY_PATTERN.test((userQuery ?? '').trim());

          // Step 1: Global/dashboard data first – rule-based answers from rankings, comparisons, metrics, methodology
          // IMPORTANT: For pure location / geography questions, **never** use rule-based metrics at all.
          const isPestelRequest = supplementWithWebSearch && systemPrompt?.includes('PESTEL');
          const shouldBypassRuleBasedForLocation = isLocationQuestion && !isPestelRequest;
          const fallbackContent = isPestelRequest || shouldBypassRuleBasedForLocation
            ? FALLBACK_GENERIC_HELP_MARKER
            : getRuleBasedFallback(
                messages,
                dashboardSnapshot,
                globalData,
                globalDataByYear ?? undefined,
              );
          const isGeneralKnowledge = isLocationQuestion || isGeneralKnowledgeQuery(userQuery);
          // Fallback safeguard: if rule-based returned a country metrics/overview card but the query is location/geography (including neighbours), use LLM instead
          const looksLikeCountryMetricsCard = /\*\*[^*]+ – (?:Key metrics|Full overview)\s*\(/.test(
            fallbackContent,
          );
          const queryLooksLikeLocation = isLocationQuestion;
          const shouldIgnoreFallbackForLocation = looksLikeCountryMetricsCard && queryLooksLikeLocation;
          if (
            !fallbackContent.includes(FALLBACK_GENERIC_HELP_MARKER) &&
            !isGeneralKnowledge &&
            !shouldIgnoreFallbackForLocation
          ) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ content: fallbackContent, source: SOURCE_FALLBACK }));
            return;
          }

          // Step 2: Groq (first LLM) when global data can't answer or for any non-metric / key-fact question
          // Step 3: Tavily / web search (second) when Groq is unavailable or cannot produce a valid answer
          // Step 4: Other LLMs (user-selected or fallback list) as a final resort
          // NOTE: We intentionally try Groq **before** Tavily for all general-knowledge and out-of-scope questions.
          const tryGroqFirst = true;

          // PESTEL: supplement system prompt with web search for dimensions with limited dashboard data
          if (supplementWithWebSearch && dashboardSnapshot?.countryName) {
            const year = typeof dashboardSnapshot.year === 'number' ? dashboardSnapshot.year : new Date().getFullYear() - 2;
            const supplement = await fetchPestelSupplementWebSearch(dashboardSnapshot.countryName, year);
            if (supplement) {
              systemPrompt = systemPrompt + '\n\n' + supplement;
            }
          }

          const baseSystemPrompt = systemPrompt ?? '';
          let openaiFormatMessages: ChatMessage[] = [
            ...(baseSystemPrompt ? [{ role: 'system' as const, content: baseSystemPrompt }] : []),
            ...messages.map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
            })),
          ];

          const tryLlm = async (key: string, prov: LlmProvider, mod: string, msgs: ChatMessage[]): Promise<string> => {
            const toSend = prov === 'groq' ? trimForGroq(msgs) : msgs;
            if (prov === 'anthropic') return fetchAnthropic(key, mod, toSend);
            if (prov === 'google') return fetchGoogle(key, mod, toSend);
            return fetchOpenAICompatible(PROVIDER_URLS[prov], key, mod, toSend);
          };

          let content: string = '';
          let llmError: string | null = null;
          let usedModelId: string | null = null;
          let usedWebSearch = false;

          // PESTEL: use latest information first (Tavily web search), then fall back to historical (Groq / global data)
          if (isPestelRequest && !isValidLlmResponse(content) && dashboardSnapshot?.countryName) {
            const pestelQuery = `${dashboardSnapshot.countryName} PESTEL analysis latest current`.trim();
            const webResult = await fetchWebSearch(pestelQuery);
            if (webResult?.directAnswer) {
              content = webResult.directAnswer;
              usedWebSearch = true;
            } else if (webResult?.context) {
              const snippetMatch = webResult.context.match(/- \*\*(?:[^*]+)\*\* \(([^)]+)\): ([^\n]+)/) || webResult.context.match(/- \*\*(?:[^*]+)\*\*: ([^\n]+)/);
              if (snippetMatch) {
                const url = snippetMatch[1]?.startsWith('http') ? snippetMatch[1] : undefined;
                const text = snippetMatch[2] ?? snippetMatch[1];
                content = url ? `Based on latest web search: ${text}\n\nSource: [${url}](${url})` : `Based on latest web search: ${text}`;
                usedWebSearch = true;
              }
            }
          }

          // Step 2: Groq for questions within period until current year minus 2 (when global data couldn't answer)
          // When user selected Tavily as model, try Tavily first (so they get web search right after global data)
          if (model === 'tavily-web-search' && !isValidLlmResponse(content)) {
            const webResult = await fetchWebSearch(userQuery);
            if (webResult?.directAnswer) {
              const country = extractCountryForWiki(userQuery);
              const wikiSlug = encodeURIComponent(country.replace(/\s+/g, '_'));
              const wikiLink = `For more: [${country} – Wikipedia](https://en.wikipedia.org/wiki/${wikiSlug})`;
              content = webResult.directAnswer.includes('Wikipedia') || webResult.directAnswer.includes('http')
                ? webResult.directAnswer
                : `${webResult.directAnswer} ${wikiLink}`;
              usedWebSearch = true;
            } else if (webResult?.context) {
              const snippetMatch = webResult.context.match(/- \*\*(?:[^*]+)\*\* \(([^)]+)\): ([^\n]+)/) || webResult.context.match(/- \*\*(?:[^*]+)\*\*: ([^\n]+)/);
              if (snippetMatch) {
                const url = snippetMatch[1]?.startsWith('http') ? snippetMatch[1] : undefined;
                const text = snippetMatch[2] ?? snippetMatch[1];
                content = url ? `Based on web search: ${text}\n\nSource: [${url}](${url})` : `Based on web search: ${text}`;
                usedWebSearch = true;
              }
            }
          }

          if (!isValidLlmResponse(content) && tryGroqFirst) {
            const groqKey = getServerApiKey('groq');
            if (groqKey) {
              try {
                content = await tryLlm(groqKey, 'groq', 'llama-3.3-70b-versatile', openaiFormatMessages);
                if (isValidLlmResponse(content)) usedModelId = 'llama-3.3-70b-versatile';
              } catch (err) {
                if (isRateLimitError(err)) {
                  try {
                    content = await tryLlm(groqKey, 'groq', GROQ_SMALL_MODEL, openaiFormatMessages);
                    if (isValidLlmResponse(content)) usedModelId = GROQ_SMALL_MODEL;
                    else llmError = err instanceof Error ? err.message : String(err);
                  } catch (retryErr) {
                    llmError = err instanceof Error ? err.message : String(err);
                    content = '';
                  }
                } else {
                  llmError = err instanceof Error ? err.message : String(err);
                  content = '';
                }
              }
            }
          }

          // Step 3: Tavily for latest data / "now" (when not covered by global data or Groq)
          // Also try Tavily when user explicitly selected Tavily as the model.
          const tryTavilyNow =
            model === 'tavily-web-search' ||
            !isValidLlmResponse(content);
          if (tryTavilyNow && !isValidLlmResponse(content)) {
            const webResult = await fetchWebSearch(userQuery);
            if (webResult?.directAnswer) {
              const country = extractCountryForWiki(userQuery);
              const wikiSlug = encodeURIComponent(country.replace(/\s+/g, '_'));
              const wikiLink = `For more: [${country} – Wikipedia](https://en.wikipedia.org/wiki/${wikiSlug})`;
              content = webResult.directAnswer.includes('Wikipedia') || webResult.directAnswer.includes('http')
                ? webResult.directAnswer
                : `${webResult.directAnswer} ${wikiLink}`;
              usedWebSearch = true;
            } else if (webResult?.context) {
              const snippetMatch = webResult.context.match(/- \*\*(?:[^*]+)\*\* \(([^)]+)\): ([^\n]+)/) || webResult.context.match(/- \*\*(?:[^*]+)\*\*: ([^\n]+)/);
              if (snippetMatch) {
                const url = snippetMatch[1]?.startsWith('http') ? snippetMatch[1] : undefined;
                const text = snippetMatch[2] ?? snippetMatch[1];
                content = url ? `Based on web search: ${text}\n\nSource: [${url}](${url})` : `Based on web search: ${text}`;
                usedWebSearch = true;
              }
            }
          }

          // PESTEL: prefer user's model first if they have a key (saves Groq free-tier tokens)
          const userHasNonGroqKey = isPestelRequest && apiKey && getProviderForModel(model) !== 'groq' && getProviderForModel(model) !== 'tavily';
          if (userHasNonGroqKey && !isValidLlmResponse(content)) {
            try {
              content = await tryLlm(apiKey, getProviderForModel(model) ?? 'openai', model, openaiFormatMessages);
              if (isValidLlmResponse(content)) usedModelId = model;
            } catch (err) {
              llmError = err instanceof Error ? err.message : String(err);
              content = '';
            }
          }

          // Step 4: Other LLMs (user-selected or fallback list) when still no content
            const prov = getProviderForModel(model);
            if (apiKey && prov !== 'groq' && prov !== 'tavily') {
              try {
                content = await tryLlm(apiKey, prov ?? 'openai', model, openaiFormatMessages);
                if (isValidLlmResponse(content)) usedModelId = model;
              } catch (err) {
                llmError = err instanceof Error ? err.message : String(err);
              }
            }
            if (!isValidLlmResponse(content)) {
              for (const { provider: p, model: m } of FREE_LLM_FALLBACK_PRIORITY) {
                if (p === 'groq') continue;
                const key = getServerApiKey(p);
                if (!key) continue;
                try {
                  content = await tryLlm(key, p, m, openaiFormatMessages);
                  if (isValidLlmResponse(content)) {
                    llmError = null;
                    usedModelId = m;
                    break;
                  }
                } catch (err) {
                  llmError = err instanceof Error ? err.message : String(err);
                }
              }
            }
          }

          let source = usedModelId ? getModelLabel(usedModelId) : usedWebSearch ? 'Web search' : SOURCE_FALLBACK;
          if (!isValidLlmResponse(content)) {
            if (isLocationQuestion) {
              // For location / geography questions, never fall back to dashboard metrics.
              // If LLMs or web search are unavailable, return a safe guidance message instead.
              content = LOCATION_FALLBACK_MESSAGE;
              source = 'Assistant guidance';
            } else {
              const finalFallback = getRuleBasedFallback(
                messages,
                dashboardSnapshot,
                globalData,
                globalDataByYear ?? undefined,
              );
              const hint = finalFallback.includes(FALLBACK_GENERIC_HELP_MARKER) ? SETUP_HINT : '';
              const errorNote = llmError
                ? `\n\n---\n**Note:** ${formatUserFriendlyError(llmError)}`
                : '';
              content = finalFallback + hint + errorNote;
              source = SOURCE_FALLBACK;
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ content, source }));
        } catch (err) {
          console.error('[chat-api]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Internal server error',
            }),
          );
        }
}

export function chatApiPlugin(): Plugin {
  return {
    name: 'chat-api',
    enforce: 'pre',
    configResolved(config) {
      const envDir = (config.envDir ?? config.root ?? __dirname) as string;
      // Ensure .env is loaded from project root (dev may run from different cwd)
      loadDotenv({ path: path.join(envDir, '.env') });
      const env = loadEnv(config.mode, envDir, '');
      for (const [k, v] of Object.entries(env)) {
        if (v !== undefined && process.env[k] === undefined) {
          process.env[k] = v;
        }
      }
      isDevMode = config.mode === 'development';
      const groqKey = process.env.GROQ_API_KEY?.trim();
      const hasGroq = !!groqKey && !PLACEHOLDER_PATTERNS.test(groqKey);
      const tavilyKey = process.env.TAVILY_API_KEY?.trim();
      const serperKey = process.env.SERPER_API_KEY?.trim();
      const hasTavily = !!tavilyKey && !tavilyKey.startsWith('tvly-your') && !PLACEHOLDER_PATTERNS.test(tavilyKey);
      const hasSerper = !!serperKey && !PLACEHOLDER_PATTERNS.test(serperKey);
      console.log(`[chat-api] Free LLM: ${hasGroq ? 'configured' : 'No key – add required key to .env for general questions'}`);
      if (hasTavily || hasSerper) {
        console.log(`[chat-api] Web search: ${hasTavily ? 'Tavily' : ''}${hasTavily && hasSerper ? ' + ' : ''}${hasSerper ? 'Serper' : ''} configured – general-knowledge answers will use latest web results`);
      } else {
        console.log('[chat-api] For latest data on general questions, add required web search key to .env. See .env.example for variable names.');
      }
    },
    configureServer(server) {
      server.middlewares.use('/api/chat', handleChatRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/chat', handleChatRequest);
    },
  };
}
