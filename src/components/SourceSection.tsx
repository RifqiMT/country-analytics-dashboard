import { useMemo, useRef, useState } from 'react';
import { METRIC_METADATA, EDUCATION_SUBCATEGORY_LABELS, EDUCATION_SUBCATEGORY_ORDER } from '../data/metricMetadata';
import type { MetricMetadata } from '../data/metricMetadata';

const CATEGORY_LABELS: Record<MetricMetadata['category'], string> = {
  financial: 'Financial',
  population: 'Population',
  health: 'Health',
  geography: 'Geography',
  context: 'Country metadata & context',
  education: 'Education',
};

/** Filter chips by data source – metrics are filtered to those citing each source. */
const SOURCE_FILTER_CHIPS = [
  'World Bank',
  'IMF',
  'REST Countries',
  'Sea Around Us',
  'Marine Regions',
  'ILO',
  'WHO',
  'UN',
  'FAO',
  'UNESCO',
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
  const [isWhereMetricsExpanded, setIsWhereMetricsExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const metricRefs = useRef<Map<string, HTMLElement>>(new Map());

  const filteredMetrics = useMemo(
    () => METRIC_METADATA.filter((m) => matchesSearch(m, searchQuery)),
    [searchQuery],
  );

  const byCategory = useMemo(() => {
    const acc = {} as Record<MetricMetadata['category'], MetricMetadata[]>;
    for (const cat of ['financial', 'population', 'health', 'geography', 'context', 'education'] as const) {
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
    'education',
    'geography',
    'context',
  ];

  return (
    <section className="card source-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Data sources & methodology</h2>
          <p className="muted">
            Country Analytics Platform provides a modern, analyst-grade view across financial, demographic, health, and education metrics for every country (2000 – latest), powered by World Bank WDI, IMF WEO, UNESCO UIS, UN/WHO, and Marine Regions. This tab lists definitions, formulas, and units for every metric and variable used in the app. Each entry links to credible primary sources: World Bank, IMF, REST Countries, Sea Around Us, Marine Regions, ILO, WHO, UN, FAO, UNESCO. Coverage: Country Dashboard, Global Analytics (map, table, charts — with region filter), PESTEL, Porter’s Five Forces, Business Analytics, and Analytics Assistant.
          </p>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Time series and indicator data generally span from 2000 to the latest available year (current year minus 2). Government debt (% of GDP) uses World Bank WDI first; when a country has no World Bank data (e.g. China), IMF World Economic Outlook (WEO) is used automatically. Education metrics come from UNESCO Institute for Statistics via World Bank WDI. Definitions reflect current methodology where documented by the source.
          </p>
        </div>
      </div>

      <div className="source-assistant-flow">
        <button
          type="button"
          className="source-assistant-flow-header"
          onClick={() => setIsWhereMetricsExpanded((v) => !v)}
          aria-expanded={isWhereMetricsExpanded}
          aria-controls="source-where-metrics-content"
          id="source-where-metrics-heading"
        >
          <h3 className="source-category-title source-assistant-flow-title">
            Where metrics and information appear
          </h3>
          <span
            className={`source-assistant-flow-chevron ${isWhereMetricsExpanded ? 'source-assistant-flow-chevron--expanded' : ''}`}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>
        <div
          id="source-where-metrics-content"
          role="region"
          aria-labelledby="source-where-metrics-heading"
          className="source-assistant-flow-content"
          hidden={!isWhereMetricsExpanded}
        >
        <p className="source-assistant-intro muted">
          The same metrics and sources are used across Country Dashboard, Global Analytics (map, table, charts), PESTEL, Porter’s Five Forces, Business Analytics, and the Analytics Assistant. Global Analytics supports a <strong>region filter</strong> (dynamic, searchable) so map, table, and charts can be limited to one region. Location and geography (where a country is, continent, neighbouring countries) are answered by the Analytics Assistant via LLM and web search, using credible sources such as Wikipedia and CIA World Factbook (linked in the &quot;Location &amp; geographic context&quot; metric below).
        </p>

        <div className="source-feature-list">
          <h4 className="source-feature-name">Country Dashboard</h4>
          <p className="muted">
            Summary cards (latest values and YoY), Unified Financial &amp; Population Timeline, Macro Indicators Timeline (economic &amp; financial and health), Unemployed &amp; Labour Force Timeline, Population Structure (age-group shares and absolute counts), and Country Comparison table. Data: World Bank WDI, IMF WEO (fallbacks for GDP and government debt when WB has no data). Territory fallbacks (e.g. Taiwan) use parent or regional data when direct series are missing; government debt is filled from IMF WEO for countries like China where World Bank has no debt series. For some small territories and city-states (e.g. Monaco, Channel Islands), selected health &amp; demographics metrics may reuse parent-country WDI health series when no direct values exist; where neither WDI, IMF, WHO/UN, nor fallbacks provide a reliable series, the UI shows <strong>&quot;No data&quot;</strong>.
          </p>

          <h4 className="source-feature-name">Global Analytics (Map, Table, Charts)</h4>
          <p className="muted">
            <strong>Region filter</strong>: Dynamic, searchable region filter limits map, global table, and global charts to one region (or &quot;All regions&quot;). Choropleth map: any metric from the list (GDP, population, life expectancy, inflation, debt, unemployment, labour force, poverty, age-group shares, land/area/EEZ, region, government type). Global table: all countries (or filtered by region) and years with sortable columns and YoY growth. Global Charts: aggregated global time-series (unified, economic, health, education, population structure) with frequency and chart/table view; data respects the region filter. Sources: World Bank WDI, IMF WEO, Sea Around Us, Marine Regions, REST Countries (region, government type). Country list: World Bank with synthetic entries for territories when needed. For some micro-territories or landlocked economies where no standalone EEZ geometry is published in Sea Around Us / Marine Regions, the dashboard shows <strong>&quot;No EEZ data&quot;</strong> instead of a numeric value.
          </p>

          <h4 className="source-feature-name">Global Charts</h4>
          <p className="muted">
            Aggregated global time-series and cross-country comparisons (GDP, population, health, labour, education, population structure). Same underlying data as Country Dashboard and Global view; region filter applies. World Bank WDI, IMF WEO, UNESCO UIS (education), REST Countries, Sea Around Us, Marine Regions. Definitions and formulas for each series are in the metric cards below.
          </p>

          <h4 className="source-feature-name">PESTEL &amp; Porter’s Five Forces</h4>
          <p className="muted">
            Political, Economic, Social, Technological, Environmental, Legal and SWOT (PESTEL); Porter’s Five Forces content generated from dashboard data and country context. Inputs: World Bank WDI, IMF WEO, REST Countries (government, currency, capital), Sea Around Us / Marine Regions (EEZ). LLM providers when API keys are set; otherwise rule-based summaries from the same metrics.
          </p>

          <h4 className="source-feature-name">Business Analytics</h4>
          <p className="muted">
            Correlation scatter: any two metrics from the global dataset (X and Y). Correlation &amp; causation analysis: Pearson correlation coefficient (r), approximate p-value, and trend line. Data: same as Global view (World Bank, IMF, REST Countries, Sea Around Us, Marine Regions). No separate data source; methodology is documented in the UI.
          </p>

          <h4 className="source-feature-name">Analytics Assistant – answer sources</h4>
          <p className="muted">
            Each response shows its source (e.g. &quot;Dashboard data&quot;, &quot;Llama 3.3 70B (Groq)&quot;, &quot;Web search&quot;). The assistant answers both <strong>dashboard metrics</strong> (rankings, comparisons, methodology, data sources) and <strong>general knowledge</strong> (e.g. <strong>location/geography</strong> — where a country is located, which continent — plus leaders, culture, current events). Cascading flow:
          </p>
        </div>
        <ol className="source-assistant-steps">
          <li>
            <strong>Dashboard data</strong> – Rule-based answers from World Bank WDI, IMF WEO, UNESCO UIS (via WDI), and Sea Around Us / Marine Regions for rankings, comparisons, single-metric lookups, and methodology questions. Uses all metrics in this tab plus region, income level, government type from World Bank and REST Countries. <strong>Location/geography questions</strong> (e.g. &quot;where is Indonesia located?&quot;) are not answered from dashboard data; they use the fallback below.
          </li>
          <li>
            <strong>Groq (Llama 3.3 70B)</strong> – First LLM used when dashboard/global data cannot answer or when the question is outside global data (general knowledge, key facts, location/geography, leaders, history).
          </li>
          <li>
            <strong>Web search (Tavily)</strong> – Second step when Groq is unavailable or cannot produce a good answer, or when Tavily Web Search is selected as the model for direct web-search based answers.
          </li>
          <li>
            <strong>Other LLMs + Tavily Web Search</strong> – OpenAI, Anthropic, Google, OpenRouter, or Tavily Web Search (selectable in the model dropdown) when a user API key or server key is set.
          </li>
        </ol>
        <p className="source-assistant-intro muted" style={{ marginTop: '0.75rem' }}>
          <strong>Potential questions</strong> — Metrics: &quot;Compare Indonesia to Malaysia&quot;, &quot;Top 10 countries by GDP&quot;, &quot;Summary of key metrics&quot;, &quot;What is government debt?&quot;, &quot;Data sources&quot;. General knowledge (fallback): &quot;Where is Indonesia located?&quot;, &quot;Which continent is Ukraine in?&quot;, &quot;Who is the president of France?&quot;
        </p>
        <p className="source-assistant-intro muted">
          All metrics below (Financial, Population, Health, Education, Geography, Country metadata &amp; context) are searchable and linked to their primary sources.
        </p>
        </div>
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

          const isEducation = category === 'education';
          const educationBySub = isEducation && metrics.every((m) => m.educationSubcategory)
            ? EDUCATION_SUBCATEGORY_ORDER.reduce((acc, sub) => {
                const list = metrics.filter((m) => m.educationSubcategory === sub);
                if (list.length) acc[sub] = list;
                return acc;
              }, {} as Record<NonNullable<MetricMetadata['educationSubcategory']>, MetricMetadata[]>)
            : null;

          return (
            <div key={category} className="source-category">
              <h3 className="source-category-title">
                {CATEGORY_LABELS[category]}
              </h3>
              {educationBySub ? (
                EDUCATION_SUBCATEGORY_ORDER.map((sub) => {
                  const subMetrics = educationBySub[sub];
                  if (!subMetrics?.length) return null;
                  return (
                    <div key={sub} className="source-education-subcategory">
                      <h4 className="source-subcategory-title">
                        {EDUCATION_SUBCATEGORY_LABELS[sub]}
                      </h4>
                      <div className="source-metric-list">
                        {subMetrics.map((metric) => (
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
                })
              ) : (
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
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
