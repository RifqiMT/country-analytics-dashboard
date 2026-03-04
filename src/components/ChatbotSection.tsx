import { useCallback, useEffect, useRef, useState } from 'react';
import { buildChatSystemPrompt } from '../utils/chatContext';
import type { CountryDashboardData } from '../types';
import type { GlobalCountryRowForFallback } from '../utils/chatFallback';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';
import { DATA_MAX_YEAR } from '../config';
import {
  LLM_MODELS,
  getEffectiveApiKey,
  getStoredApiKey,
  setStoredApiKey,
  getStoredModel,
  setStoredModel,
} from '../config/llm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotSectionProps {
  dashboardData?: CountryDashboardData | null;
}

const SUGGESTIONS = [
  'Give me an overview of the selected country',
  'Compare Indonesia to Malaysia',
  'Top 10 countries by GDP',
  'Indonesia and Ukraine from 2023',
  'Summary of key metrics',
];

export function ChatbotSection({ dashboardData }: ChatbotSectionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState(getStoredModel);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [globalData, setGlobalData] = useState<GlobalCountryRowForFallback[]>([]);
  const [globalDataByYear, setGlobalDataByYear] = useState<
    Record<number, GlobalCountryRowForFallback[]>
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const year =
    dashboardData?.latestSnapshot?.year ??
    dashboardData?.range?.endYear ??
    DATA_MAX_YEAR;

  useEffect(() => {
    setStoredModel(model);
  }, [model]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [rowsCurr, rowsPrev] = await Promise.all([
          fetchGlobalCountryMetricsForYear(year),
          fetchGlobalCountryMetricsForYear(year - 1),
        ]);
        if (!cancelled) {
          const map = (rows: typeof rowsCurr) =>
            rows.map((r) => ({
              name: r.name,
              iso2Code: r.iso2Code,
              gdpNominal: r.gdpNominal,
              gdpPPP: r.gdpPPP,
              gdpNominalPerCapita: r.gdpNominalPerCapita,
              gdpPPPPerCapita: r.gdpPPPPerCapita,
              populationTotal: r.populationTotal,
              lifeExpectancy: r.lifeExpectancy,
              inflationCPI: r.inflationCPI,
              govDebtPercentGDP: r.govDebtPercentGDP,
              govDebtUSD: r.govDebtUSD,
              interestRate: r.interestRate,
              landAreaKm2: r.landAreaKm2,
              totalAreaKm2: r.totalAreaKm2,
              eezKm2: r.eezKm2,
              pop0_14Pct: r.pop0_14Pct,
              pop15_64Pct: r.pop15_64Pct,
              pop65PlusPct: r.pop65PlusPct,
              region: r.region,
              headOfGovernmentType: r.headOfGovernmentType,
              governmentType: r.governmentType,
            }));
          setGlobalData(map(rowsCurr));
          setGlobalDataByYear({
            [year]: map(rowsCurr),
            [year - 1]: map(rowsPrev),
          });
        }
      } catch {
        if (!cancelled) {
          setGlobalData([]);
          setGlobalDataByYear({});
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput || undefined);
    setApiKeyInput('');
    setShowSettings(false);
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setError(null);

      const allMessages: Array<{ role: string; content: string }> = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: trimmed },
      ];

      try {
        const apiKey = getEffectiveApiKey();
        const dashboardSnapshot =
          dashboardData?.latestSnapshot && dashboardData?.summary
            ? {
                countryName: dashboardData.summary.name,
                year: dashboardData.latestSnapshot.year,
                summary: {
                  region: dashboardData.summary.region,
                  incomeLevel: dashboardData.summary.incomeLevel,
                  capitalCity: dashboardData.summary.capitalCity,
                  currencyCode: dashboardData.summary.currencyCode,
                  currencyName: dashboardData.summary.currencyName,
                  government: dashboardData.summary.government ?? dashboardData.summary.governmentType,
                  governmentType: dashboardData.summary.governmentType,
                  headOfGovernmentType: dashboardData.summary.headOfGovernmentType,
                  timezone: dashboardData.summary.timezone,
                },
                metrics: dashboardData.latestSnapshot.metrics,
              }
            : null;

        const globalDataPayload =
          globalData.length > 0
            ? globalData.map((r) => ({
                name: r.name,
                iso2Code: r.iso2Code,
                gdpNominal: r.gdpNominal,
                gdpPPP: r.gdpPPP,
                gdpNominalPerCapita: r.gdpNominalPerCapita,
                gdpPPPPerCapita: r.gdpPPPPerCapita,
                populationTotal: r.populationTotal,
                lifeExpectancy: r.lifeExpectancy,
                inflationCPI: r.inflationCPI,
                govDebtPercentGDP: r.govDebtPercentGDP,
                govDebtUSD: r.govDebtUSD,
                interestRate: r.interestRate,
                landAreaKm2: r.landAreaKm2,
                totalAreaKm2: r.totalAreaKm2,
                eezKm2: r.eezKm2,
                pop0_14Pct: r.pop0_14Pct,
                pop15_64Pct: r.pop15_64Pct,
                pop65PlusPct: r.pop65PlusPct,
                region: r.region,
                headOfGovernmentType: r.headOfGovernmentType,
                governmentType: r.governmentType,
              }))
            : null;

        const globalDataByYearPayload =
          Object.keys(globalDataByYear).length > 0
            ? Object.fromEntries(
                Object.entries(globalDataByYear).map(([y, rows]) => [
                  y,
                  rows.map((r) => ({
                    name: r.name,
                    iso2Code: r.iso2Code,
                    gdpNominal: r.gdpNominal,
                    gdpPPP: r.gdpPPP,
                    gdpNominalPerCapita: r.gdpNominalPerCapita,
                    gdpPPPPerCapita: r.gdpPPPPerCapita,
                    populationTotal: r.populationTotal,
                    lifeExpectancy: r.lifeExpectancy,
                    inflationCPI: r.inflationCPI,
                    govDebtPercentGDP: r.govDebtPercentGDP,
                    govDebtUSD: r.govDebtUSD,
                    interestRate: r.interestRate,
                    landAreaKm2: r.landAreaKm2,
                    totalAreaKm2: r.totalAreaKm2,
                    eezKm2: r.eezKm2,
                    pop0_14Pct: r.pop0_14Pct,
                    pop15_64Pct: r.pop15_64Pct,
                    pop65PlusPct: r.pop65PlusPct,
                    region: r.region,
                    headOfGovernmentType: r.headOfGovernmentType,
                    governmentType: r.governmentType,
                  })),
                ]),
              )
            : null;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: allMessages,
            systemPrompt: buildChatSystemPrompt(
              dashboardData,
              globalData,
              globalDataByYear,
            ),
            model,
            dashboardSnapshot,
            globalData: globalDataPayload,
            globalDataByYear: globalDataByYearPayload,
            ...(apiKey && { apiKey }),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error ?? `Request failed (${res.status})`);
        }

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content ?? 'No response.',
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to get response';
        setError(msg);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Sorry, I couldn't process that. ${msg}`,
          },
        ]);
      } finally {
        setIsLoading(false);
        scrollToBottom();
        inputRef.current?.focus();
      }
    },
    [
      messages,
      isLoading,
      dashboardData,
      model,
      globalData,
      globalDataByYear,
      scrollToBottom,
    ],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <section className="card chatbot-section">
      <div className="section-header chatbot-header">
        <div>
          <h2 className="section-title">Analytics assistant</h2>
          <p className="muted">
            Ask questions about the metrics, data sources, and methodology used
            in this dashboard. Powered by LLM.
          </p>
        </div>
        <div className="chatbot-controls">
          <div className="chatbot-model-select-wrap">
            <label htmlFor="chatbot-model" className="chatbot-model-label">
              Model
            </label>
            <select
              id="chatbot-model"
              className="chatbot-model-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={isLoading}
              aria-label="Select LLM model"
            >
              {LLM_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="chatbot-settings-btn"
            onClick={() => {
              setShowSettings(!showSettings);
              setApiKeyInput(getStoredApiKey() ?? '');
            }}
            aria-label="Chat settings"
            title="API key & settings"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
              />
            </svg>
            <span>Settings</span>
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="chatbot-settings-panel">
          <div className="chatbot-settings-row">
            <label htmlFor="chatbot-apikey" className="chatbot-settings-label">
              OpenAI API key
            </label>
            <input
              id="chatbot-apikey"
              type="password"
              className="chatbot-settings-input"
              placeholder="sk-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              aria-label="OpenAI API key"
            />
          </div>
          <p className="chatbot-settings-hint muted">
            Your key is stored locally. You can also set VITE_OPENAI_API_KEY in
            .env for a public demo key.
          </p>
          <div className="chatbot-settings-actions">
            <button
              type="button"
              className="chatbot-settings-save"
              onClick={handleSaveApiKey}
            >
              Save key
            </button>
            <button
              type="button"
              className="chatbot-settings-cancel"
              onClick={() => {
                setShowSettings(false);
                setApiKeyInput('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="chatbot-container">
        <div className="chatbot-messages">
          {messages.length === 0 ? (
            <div className="chatbot-welcome">
              <div className="chatbot-welcome-icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="48" height="48">
                  <path
                    fill="currentColor"
                    d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2Zm0 2a8 8 0 0 0-8 8 8 8 0 0 0 8 8 8 8 0 0 0 8-8 8 8 0 0 0-8-8Zm-1 3h2v6h-2V7Zm0 8h2v2h-2v-2Z"
                  />
                </svg>
              </div>
              <p className="chatbot-welcome-text">
                Ask anything about the data and sources in this platform.
              </p>
              <p className="chatbot-welcome-hint muted">
                Try one of these questions or type your own:
              </p>
              <div className="chatbot-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chatbot-suggestion"
                    onClick={() => handleSuggestionClick(s)}
                    disabled={isLoading}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="chatbot-message-list">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`chatbot-message chatbot-message-${m.role}${m.content.includes("couldn't process") ? ' chatbot-message-error' : ''}`}
                >
                  <div className="chatbot-message-avatar" aria-hidden>
                    {m.role === 'user' ? (
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <path
                          fill="currentColor"
                          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <path
                          fill="currentColor"
                          d="M20 2H4c-1.1 0-2 .9 2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="chatbot-message-content" role={m.role === 'user' ? undefined : 'article'}>
                    {m.role === 'assistant' ? (
                      <div
                        className="chatbot-message-markdown chat-prose"
                        dangerouslySetInnerHTML={{
                          __html: formatMessage(m.content),
                        }}
                      />
                    ) : (
                      <p className="chatbot-message-user-text">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="chatbot-message chatbot-message-assistant chatbot-loading">
                  <div className="chatbot-message-avatar">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path
                        fill="currentColor"
                        d="M20 2H4c-1.1 0-2 .9 2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"
                      />
                    </svg>
                  </div>
                  <div className="chatbot-message-content">
                    <div className="chatbot-typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chatbot-input-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="chatbot-input"
            placeholder="Ask about metrics, sources, or methodology…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            aria-label="Chat message"
          />
          <button
            type="submit"
            className="chatbot-send"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="currentColor"
                d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
              />
            </svg>
          </button>
        </form>

        {error && (
          <p className="chatbot-error muted">
            {error.includes('OPENAI_API_KEY')
              ? 'Set OPENAI_API_KEY in your environment to enable the chat.'
              : error}
          </p>
        )}
      </div>
    </section>
  );
}

/** Rich markdown-like formatting for assistant messages – distinguishable structure */
function formatMessage(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const withInline = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong class="chat-strong">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="chat-em">$1</em>')
    .replace(/`(.+?)`/g, '<code class="chat-code">$1</code>')
    .replace(/_([^_]+)_/g, '<span class="chat-muted">$1</span>');
  const lines = withInline.split('\n');
  const blocks: string[] = [];
  let listType: 'ol' | 'ul' | null = null;
  let listItems: string[] = [];
  const flushList = () => {
    if (listItems.length > 0 && listType) {
      blocks.push(`<${listType} class="chat-${listType}">${listItems.join('')}</${listType}>`);
      listItems = [];
    }
    listType = null;
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '---' || trimmed === '') {
      flushList();
      if (trimmed === '---') blocks.push('<hr class="chat-divider" />');
      else blocks.push('<br />');
      continue;
    }
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    const bulletMatch = trimmed.match(/^-\s+(.+)$/);
    if (numMatch) {
      if (listType === 'ul') flushList();
      listType = 'ol';
      listItems.push(`<li class="chat-li chat-li-num">${numMatch[2]}</li>`);
    } else if (bulletMatch) {
      if (listType === 'ol') flushList();
      listType = 'ul';
      listItems.push(`<li class="chat-li">${bulletMatch[1]}</li>`);
    } else {
      flushList();
      if (/^#{2,3}\s/.test(trimmed)) {
        const tag = trimmed.startsWith('###') ? 'h4' : 'h3';
        const content = trimmed.replace(/^#{2,3}\s+/, '');
        blocks.push(`<${tag} class="chat-${tag}">${content}</${tag}>`);
      } else {
        blocks.push(`<p class="chat-p">${trimmed}</p>`);
      }
    }
  }
  flushList();
  return blocks.join('');
}
