import { useState, useCallback, useEffect } from 'react';
import { buildPestelSystemPrompt } from '../utils/pestelContext';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';
import {
  CorrelationScatterPlot,
  SCATTER_METRIC_OPTIONS,
  type ScatterMetricKey,
} from './CorrelationScatterPlot';
import type { CountryDashboardData, GlobalCountryMetricsRow } from '../types';
import { getStoredModel, getEffectiveApiKey } from '../config/llm';

interface PESTELSectionProps {
  dashboardData?: CountryDashboardData | null;
}

/** Simple markdown-like formatting: headers, bold, links, lists */
function formatPestelContent(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="pestel-ul">
          {listItems}
        </ul>,
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      flushList();
      elements.push(<br key={key++} />);
      continue;
    }

    if (line.startsWith('#### ')) {
      flushList();
      elements.push(
        <h5 key={key++} className="pestel-h5">
          {line.slice(5)}
        </h5>,
      );
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={key++} className="pestel-h4">
          {line.slice(4)}
        </h4>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={key++} className="pestel-h3">
          {line.slice(3)}
        </h3>,
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={key++} className="pestel-h2">
          {line.slice(2)}
        </h2>,
      );
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(
        <li key={listItems.length} className="pestel-li">
          {formatInlineMarkdown(line.slice(2))}
        </li>,
      );
      continue;
    }

    flushList();
    elements.push(
      <p key={key++} className="pestel-p">
        {formatInlineMarkdown(line)}
      </p>,
    );
  }
  flushList();

  return elements;
}

function formatInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

    if (linkMatch && linkMatch.index !== undefined) {
      const before = remaining.slice(0, linkMatch.index);
      if (before) parts.push(before);
      parts.push(
        <a
          key={key++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="pestel-link"
        >
          {linkMatch[1]}
        </a>,
      );
      remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
    } else if (boldMatch && boldMatch.index !== undefined) {
      const before = remaining.slice(0, boldMatch.index);
      if (before) parts.push(before);
      parts.push(
        <strong key={key++}>{boldMatch[1]}</strong>,
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function PESTELSection({ dashboardData }: PESTELSectionProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalCountryMetricsRow[]>([]);
  const [xMetric, setXMetric] = useState<ScatterMetricKey>('gdpNominalPerCapita');
  const [yMetric, setYMetric] = useState<ScatterMetricKey>('lifeExpectancy');

  const year =
    dashboardData?.latestSnapshot?.year ?? dashboardData?.range?.endYear ?? 2022;

  useEffect(() => {
    if (!dashboardData) return;
    let cancelled = false;
    fetchGlobalCountryMetricsForYear(year).then((rows) => {
      if (!cancelled) setGlobalMetrics(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [dashboardData, year]);

  const generateAnalysis = useCallback(async () => {
    if (!dashboardData) {
      setError('Please select a country in the Country dashboard first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setSource(null);

    const model = getStoredModel();
    const apiKey = getEffectiveApiKey(model);
    const systemPrompt = buildPestelSystemPrompt(dashboardData, globalMetrics);
    const userMessage = `Generate a comprehensive PESTEL analysis for ${dashboardData.summary.name} based on the data provided. Follow the required structure: Executive summary, all six PESTEL factors (Political, Economic, Social, Technological, Environmental, Legal) with up to 2 summarized paragraphs each, Strategic implications for business (PESTEL–SWOT matrix: Opportunities and Risks and challenges), New market analysis, Key takeaways, and Recommendations. Use the exact numbers and time-series trends from the context. Keep each PESTEL element concise (max 2 paragraphs).`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          systemPrompt,
          model,
          supplementWithWebSearch: true,
          dashboardSnapshot: {
            countryName: dashboardData.summary.name,
            year: dashboardData.latestSnapshot?.year ?? dashboardData.range.endYear,
            metrics: dashboardData.latestSnapshot?.metrics,
          },
          ...(apiKey && { apiKey }),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? `Request failed (${res.status})`);
      }

      const data = (await res.json()) as {
        content?: string;
        source?: string;
      };
      setAnalysis(data.content ?? 'No response generated.');
      setSource(data.source ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PESTEL analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [dashboardData, globalMetrics]);

  const countryName = dashboardData?.summary?.name ?? 'No country selected';

  return (
    <section className="card pestel-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">PESTEL Analysis</h2>
          <p className="muted">
            Comprehensive macro-environmental analysis (Political, Economic, Social, Technological, Environmental, Legal)
            with PESTEL–SWOT matrix (Opportunities and Risks), new market analysis, key takeaways, and actionable recommendations.
            Uses World Bank, IMF, and related data; supplements with web search for dimensions with limited dashboard data.
          </p>
        </div>
      </div>

      <div className="pestel-controls">
        <div className="pestel-country-badge">
          <span className="pestel-country-label">Country:</span>
          <span className="pestel-country-name">{countryName}</span>
        </div>
        <button
          type="button"
          className="pestel-generate-btn"
          onClick={generateAnalysis}
          disabled={isLoading || !dashboardData}
          aria-label="Generate PESTEL analysis"
        >
          {isLoading ? (
            <>
              <span className="pestel-spinner" aria-hidden />
              Generating…
            </>
          ) : (
            <>
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
                <path
                  fill="currentColor"
                  d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z"
                />
                <path
                  fill="currentColor"
                  d="M8 4a.75.75 0 0 1 .75.75v2.69l3.22 3.22a.75.75 0 1 1-1.06 1.06l-3.5-3.5A.75.75 0 0 1 7.25 7V4.75A.75.75 0 0 1 8 4Z"
                />
              </svg>
              Generate PESTEL Analysis
            </>
          )}
        </button>
      </div>

      {!dashboardData && (
        <p className="pestel-hint muted">
          Select a country in the <strong>Country dashboard</strong> tab, then return here to generate
          the PESTEL analysis.
        </p>
      )}

      {error && (
        <div className="pestel-error" role="alert">
          {error}
        </div>
      )}

      {dashboardData && globalMetrics.length > 0 && (
        <div className="pestel-scatter-section">
          <h3 className="pestel-scatter-title">Multi-metric correlation analysis</h3>
          <p className="pestel-scatter-desc muted">
            Compare countries across two metrics to explore market positioning and correlations.
            The selected country is highlighted in gold.
          </p>
          <div className="pestel-scatter-controls">
            <label className="pestel-scatter-label">
              <span>X axis</span>
              <select
                value={xMetric}
                onChange={(e) => setXMetric(e.target.value as ScatterMetricKey)}
                aria-label="X-axis metric"
              >
                {SCATTER_METRIC_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="pestel-scatter-label">
              <span>Y axis</span>
              <select
                value={yMetric}
                onChange={(e) => setYMetric(e.target.value as ScatterMetricKey)}
                aria-label="Y-axis metric"
              >
                {SCATTER_METRIC_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <CorrelationScatterPlot
            data={globalMetrics}
            xMetric={xMetric}
            yMetric={yMetric}
            highlightCountryIso2={dashboardData.summary.iso2Code}
            year={year}
          />
        </div>
      )}

      {analysis && (
        <div className="pestel-output" role="article" aria-label="Comprehensive PESTEL analysis">
          <h3 className="pestel-output-title">Comprehensive Analysis</h3>
          <div className="pestel-content">
            {formatPestelContent(analysis)}
          </div>
          {source && (
            <p className="pestel-source muted">
              Source: {source}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
