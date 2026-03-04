import { useMemo, useRef, useState } from 'react';
import { METRIC_METADATA } from '../data/metricMetadata';
import type { MetricMetadata } from '../data/metricMetadata';

const CATEGORY_LABELS: Record<MetricMetadata['category'], string> = {
  financial: 'Financial',
  population: 'Population',
  health: 'Health',
  geography: 'Geography',
};

/** Filter chips by data source – metrics are filtered to those citing each source. */
const SOURCE_FILTER_CHIPS = [
  'World Bank',
  'IMF',
  'Sea Around Us',
  'Marine Regions',
];

function matchesSearch(metric: MetricMetadata, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const searchable = [
    metric.label,
    metric.id,
    metric.description,
    metric.formula ?? '',
    metric.unit,
    CATEGORY_LABELS[metric.category],
    ...metric.sources.map((s) => s.name),
  ].join(' ');
  return searchable.toLowerCase().includes(q);
}

export function SourceSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const metricRefs = useRef<Map<string, HTMLElement>>(new Map());

  const filteredMetrics = useMemo(
    () => METRIC_METADATA.filter((m) => matchesSearch(m, searchQuery)),
    [searchQuery],
  );

  const byCategory = useMemo(() => {
    const acc = {} as Record<MetricMetadata['category'], MetricMetadata[]>;
    for (const cat of ['financial', 'population', 'health', 'geography'] as const) {
      acc[cat] = [];
    }
    for (const m of filteredMetrics) {
      acc[m.category].push(m);
    }
    return acc;
  }, [filteredMetrics]);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return filteredMetrics
      .filter((m) => m.label.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchQuery, filteredMetrics]);

  const handleSuggestionClick = (metric: MetricMetadata) => {
    setSearchQuery(metric.label);
    setIsSuggestionsOpen(false);
    const el = metricRefs.current.get(metric.id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const categoryOrder: MetricMetadata['category'][] = [
    'financial',
    'population',
    'health',
    'geography',
  ];

  return (
    <section className="card source-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Data sources & methodology</h2>
          <p className="muted">
            All metrics used in this dashboard, with descriptions, formulas, and links to the
            original data sources.
          </p>
        </div>
      </div>

      <div className="source-assistant-flow">
        <h3 className="source-category-title">Analytics Assistant – answer sources</h3>
        <p className="source-assistant-intro muted">
          The chat assistant uses a cascading flow to answer questions. Each response shows its
          source (e.g. &quot;Dashboard data&quot;, &quot;Llama 3.3 70B (Groq)&quot;, &quot;Web search&quot;).
        </p>
        <ol className="source-assistant-steps">
          <li>
            <strong>Dashboard data</strong> – Rule-based answers from World Bank, IMF, and Sea Around Us
            data for rankings, comparisons, single-metric lookups, and methodology questions.
          </li>
          <li>
            <strong>Groq (Llama 3.3 70B)</strong> – General-knowledge questions (e.g. leaders, capital,
            language, religion) when the rule-based fallback cannot answer. Requires server env key in .env.
          </li>
          <li>
            <strong>Web search</strong> – Tavily or Serper for up-to-date answers when Groq fails or
            for real-time data. Requires server env key in .env (see .env.example).
          </li>
          <li>
            <strong>Other LLMs</strong> – OpenAI, Anthropic, Google, or OpenRouter when a user API key
            is set and the selected model is used.
          </li>
        </ol>
      </div>

      <div className="source-search-wrapper">
        <div className="source-search-row">
          <div className="source-search-input-wrap">
            <span className="source-search-icon" aria-hidden>
              <svg viewBox="0 0 16 16" width="16" height="16">
                <path
                  d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-.82 4.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              className="source-search-input"
              placeholder="Search metrics by name, description, formula, or source…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSuggestionsOpen(true)}
              onBlur={() =>
                setTimeout(() => setIsSuggestionsOpen(false), 150)
              }
              aria-label="Search metrics"
            />
            {searchQuery && (
              <button
                type="button"
                className="source-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <svg viewBox="0 0 16 16" width="14" height="14">
                  <path
                    d="M4.72 4.72a.75.75 0 0 1 1.06 0L8 6.94l2.22-2.22a.75.75 0 1 1 1.06 1.06L9.06 8l2.22 2.22a.75.75 0 1 1-1.06 1.06L8 9.06l-2.22 2.22a.75.75 0 0 1-1.06-1.06L6.94 8 4.72 5.78a.75.75 0 0 1 0-1.06Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="source-suggestion-chips">
          <span className="source-chips-label">Filter by source:</span>
          {SOURCE_FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`source-chip ${searchQuery.toLowerCase() === chip.toLowerCase() ? 'source-chip-active' : ''}`}
              onClick={() =>
                setSearchQuery(searchQuery === chip ? '' : chip)
              }
            >
              {chip}
            </button>
          ))}
        </div>

        {isSuggestionsOpen && suggestions.length > 0 && (
          <div className="source-suggestions-dropdown">
            {suggestions.map((metric) => (
              <button
                key={metric.id}
                type="button"
                className="source-suggestion-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSuggestionClick(metric);
                }}
              >
                <span className="source-suggestion-label">{metric.label}</span>
                <span className="source-suggestion-category">
                  {CATEGORY_LABELS[metric.category]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredMetrics.length === 0 && (
        <p className="source-no-results muted">
          No metrics match &quot;{searchQuery}&quot;. Try a different search term or clear the
          search.
        </p>
      )}

      <div className="source-content">
        {categoryOrder.map((category) => {
          const metrics = byCategory[category];
          if (!metrics?.length) return null;

          return (
            <div key={category} className="source-category">
              <h3 className="source-category-title">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="source-metric-list">
                {metrics.map((metric) => (
                  <article
                    key={metric.id}
                    ref={(el) => {
                      if (el) metricRefs.current.set(metric.id, el);
                    }}
                    className="source-metric-card"
                  >
                    <div className="source-metric-header">
                      <h4 className="source-metric-label">{metric.label}</h4>
                      <span className="source-metric-unit">{metric.unit}</span>
                    </div>
                    <p className="source-metric-description">
                      {metric.description}
                    </p>
                    {metric.formula && (
                      <div className="source-metric-formula">
                        <span className="source-metric-formula-label">
                          Formula
                        </span>
                        <code className="source-metric-formula-value">
                          {metric.formula}
                        </code>
                      </div>
                    )}
                    <div className="source-metric-sources">
                      <span className="source-metric-sources-label">
                        Sources
                      </span>
                      <ul className="source-metric-sources-list">
                        {metric.sources.map((src, i) => (
                          <li key={i}>
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="source-link"
                              title={src.url}
                            >
                              <span className="source-link-text">{src.name}</span>
                              <span className="source-link-icon" aria-hidden>
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                  <polyline points="15 3 21 3 21 9" />
                                  <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
