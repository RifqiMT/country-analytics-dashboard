/**
 * LLM configuration for the Analytics Assistant.
 * Supports multiple providers (OpenAI, Groq, Anthropic, Google, OpenRouter)
 * with performance tiers and optional public/demo API keys via env.
 */

export type LlmProvider =
  | 'openai'
  | 'groq'
  | 'anthropic'
  | 'google'
  | 'openrouter';

/** Performance tier: 1 = best, 2 = balanced, 3 = fast */
export type PerformanceTier = 'tier1' | 'tier2' | 'tier3';

export interface LlmModel {
  id: string;
  label: string;
  provider: LlmProvider;
  /** Performance tier for grouping in UI */
  tier: PerformanceTier;
  description?: string;
}

/** Tier labels for UI */
export const TIER_LABELS: Record<PerformanceTier, string> = {
  tier1: 'Best (highest capability)',
  tier2: 'Balanced (speed + quality)',
  tier3: 'Fast (routine tasks)',
};

export const LLM_MODELS: LlmModel[] = [
  // ─── Tier 1: Best (highest capability) ───
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    tier: 'tier1',
    description: 'Flagship model, highest capability',
  },
  {
    id: 'claude-sonnet-4-20250514',
    label: 'Claude Sonnet 4',
    provider: 'anthropic',
    tier: 'tier1',
    description: 'Anthropic flagship, strong reasoning',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    tier: 'tier1',
    description: 'High intelligence, 200k context',
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'google',
    tier: 'tier1',
    description: 'Google flagship, 1M context',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    label: 'Llama 3.3 70B (OpenRouter)',
    provider: 'openrouter',
    tier: 'tier1',
    description: 'Meta flagship via OpenRouter',
  },
  {
    id: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    tier: 'tier1',
    description: 'Meta flagship, very fast inference, free tier (default)',
  },
  // ─── Tier 2: Balanced (speed + quality) ───
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openai',
    tier: 'tier2',
    description: 'Fast and cost-effective',
  },
  {
    id: 'gpt-4-turbo',
    label: 'GPT-4 Turbo',
    provider: 'openai',
    tier: 'tier2',
    description: 'High intelligence, 128k context',
  },
  {
    id: 'gpt-4',
    label: 'GPT-4',
    provider: 'openai',
    tier: 'tier2',
    description: 'Previous flagship model',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    label: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    tier: 'tier2',
    description: 'Fast, balanced quality',
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    provider: 'google',
    tier: 'tier2',
    description: 'Fast, 1M context',
  },
  {
    id: 'gemini-2.0-flash-exp',
    label: 'Gemini 2.0 Flash',
    provider: 'google',
    tier: 'tier2',
    description: 'Latest Flash, experimental',
  },
  {
    id: 'meta-llama/llama-3.1-70b-instruct',
    label: 'Llama 3.1 70B (OpenRouter)',
    provider: 'openrouter',
    tier: 'tier2',
    description: 'Meta 70B via OpenRouter',
  },
  {
    id: 'google/gemini-2.0-flash-001',
    label: 'Gemini 2.0 Flash (OpenRouter)',
    provider: 'openrouter',
    tier: 'tier2',
    description: 'Google via OpenRouter',
  },
  // ─── Tier 3: Fast (routine tasks) ───
  {
    id: 'gpt-3.5-turbo',
    label: 'GPT-3.5 Turbo',
    provider: 'openai',
    tier: 'tier3',
    description: 'Fast, routine tasks',
  },
  {
    id: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B (Groq)',
    provider: 'groq',
    tier: 'tier3',
    description: 'Very fast, free tier',
  },
  {
    id: 'claude-3-haiku-20240307',
    label: 'Claude 3 Haiku',
    provider: 'anthropic',
    tier: 'tier3',
    description: 'Fastest Claude model',
  },
  {
    id: 'gemini-1.5-flash-8b',
    label: 'Gemini 1.5 Flash 8B',
    provider: 'google',
    tier: 'tier3',
    description: 'Lightweight, fast',
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct',
    label: 'Llama 3.1 8B (OpenRouter)',
    provider: 'openrouter',
    tier: 'tier3',
    description: 'Meta 8B via OpenRouter',
  },
  {
    id: 'mistralai/mistral-7b-instruct',
    label: 'Mistral 7B (OpenRouter)',
    provider: 'openrouter',
    tier: 'tier3',
    description: 'Mistral 7B via OpenRouter',
  },
];

/** Default model when none selected – free tier, high capability (Groq Llama 3.3 70B) */
export const DEFAULT_LLM_MODEL = 'llama-3.3-70b-versatile';

/** Env var names for public/demo keys (client-side VITE_*, server-side without prefix) */
export const PROVIDER_ENV_KEYS: Record<LlmProvider, { client: string; server: string }> = {
  openai: { client: 'VITE_OPENAI_API_KEY', server: 'OPENAI_API_KEY' },
  groq: { client: 'VITE_GROQ_API_KEY', server: 'GROQ_API_KEY' },
  anthropic: { client: 'VITE_ANTHROPIC_API_KEY', server: 'ANTHROPIC_API_KEY' },
  google: { client: 'VITE_GOOGLE_AI_API_KEY', server: 'GOOGLE_AI_API_KEY' },
  openrouter: { client: 'VITE_OPENROUTER_API_KEY', server: 'OPENROUTER_API_KEY' },
};

/** Get public/demo API key for a provider from env (client-side) */
export function getPublicApiKey(provider: LlmProvider): string | undefined {
  try {
    const meta = import.meta as unknown as { env?: Record<string, string> };
    const env = meta?.env;
    if (!env) return undefined;
    const key = PROVIDER_ENV_KEYS[provider].client;
    const val = env[key];
    return typeof val === 'string' ? val.trim() || undefined : undefined;
  } catch {
    return undefined;
  }
}

/** Get provider for a model ID */
export function getProviderForModel(modelId: string): LlmProvider | undefined {
  return LLM_MODELS.find((m) => m.id === modelId)?.provider;
}

/** Get model by ID */
export function getModelById(modelId: string): LlmModel | undefined {
  return LLM_MODELS.find((m) => m.id === modelId);
}

/** Models grouped by performance tier */
export function getModelsByTier(): Record<PerformanceTier, LlmModel[]> {
  const grouped: Record<PerformanceTier, LlmModel[]> = {
    tier1: [],
    tier2: [],
    tier3: [],
  };
  for (const m of LLM_MODELS) {
    grouped[m.tier].push(m);
  }
  return grouped;
}

const STORAGE_KEY_PREFIX = 'country-analytics-api-key-';
const STORAGE_KEY_MODEL = 'country-analytics-llm-model';
const STORAGE_VERSION = '2';
const STORAGE_KEY_VERSION = 'country-analytics-llm-version';

export function getStoredApiKey(provider?: LlmProvider): string | undefined {
  try {
    const key = provider
      ? `${STORAGE_KEY_PREFIX}${provider}`
      : `${STORAGE_KEY_PREFIX}openai`;
    const v = localStorage.getItem(key);
    return v?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function setStoredApiKey(provider: LlmProvider, key: string | undefined): void {
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${provider}`;
    if (key?.trim()) {
      localStorage.setItem(storageKey, key.trim());
    } else {
      localStorage.removeItem(storageKey);
    }
  } catch {
    /* ignore */
  }
}

export function getStoredModel(): string {
  try {
    const version = localStorage.getItem(STORAGE_KEY_VERSION);
    if (version !== STORAGE_VERSION) {
      localStorage.setItem(STORAGE_KEY_VERSION, STORAGE_VERSION);
      localStorage.removeItem(STORAGE_KEY_MODEL);
      return DEFAULT_LLM_MODEL;
    }
    const v = localStorage.getItem(STORAGE_KEY_MODEL);
    if (v && LLM_MODELS.some((m) => m.id === v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_LLM_MODEL;
}

export function setStoredModel(modelId: string): void {
  try {
    if (LLM_MODELS.some((m) => m.id === modelId)) {
      localStorage.setItem(STORAGE_KEY_MODEL, modelId);
      localStorage.setItem(STORAGE_KEY_VERSION, STORAGE_VERSION);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Resolves the API key to use for a given model: user-stored > public env > undefined.
 * The backend will use its own env key if client sends none.
 */
export function getEffectiveApiKey(modelId: string): string | undefined {
  const provider = getProviderForModel(modelId) ?? 'openai';
  return getStoredApiKey(provider) ?? getPublicApiKey(provider);
}
