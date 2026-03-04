/**
 * LLM configuration for the Analytics Assistant.
 * Supports OpenAI models and optional public/fallback API key.
 */

export interface LlmModel {
  id: string;
  label: string;
  provider: 'openai';
  description?: string;
}

export const LLM_MODELS: LlmModel[] = [
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    description: 'Flagship model, highest capability',
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openai',
    description: 'Fast and cost-effective (default)',
  },
  {
    id: 'gpt-4-turbo',
    label: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'High intelligence, 128k context',
  },
  {
    id: 'gpt-4',
    label: 'GPT-4',
    provider: 'openai',
    description: 'Previous flagship model',
  },
  {
    id: 'gpt-3.5-turbo',
    label: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Fast, routine tasks',
  },
];

/** Default model when none selected */
export const DEFAULT_LLM_MODEL = 'gpt-4o-mini';

/** Public/demo API key - set via VITE_OPENAI_API_KEY for out-of-box demo. */
export const PUBLIC_OPENAI_API_KEY =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENAI_API_KEY
    ? String(import.meta.env.VITE_OPENAI_API_KEY).trim() || undefined
    : undefined;

const STORAGE_KEY_API = 'country-analytics-openai-api-key';
const STORAGE_KEY_MODEL = 'country-analytics-llm-model';

export function getStoredApiKey(): string | undefined {
  try {
    const v = localStorage.getItem(STORAGE_KEY_API);
    return v?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function setStoredApiKey(key: string | undefined): void {
  try {
    if (key?.trim()) {
      localStorage.setItem(STORAGE_KEY_API, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_API);
    }
  } catch {
    /* ignore */
  }
}

export function getStoredModel(): string {
  try {
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
    }
  } catch {
    /* ignore */
  }
}

/**
 * Resolves the API key to use: user-stored > public env > undefined.
 * The backend will use its own env key if client sends none.
 */
export function getEffectiveApiKey(): string | undefined {
  return getStoredApiKey() ?? PUBLIC_OPENAI_API_KEY;
}
