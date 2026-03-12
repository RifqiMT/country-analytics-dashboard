import { useState, useCallback, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { buildPorter5ForcesSystemPrompt } from '../utils/porter5ForcesContext';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';
import type { CountryDashboardData, GlobalCountryMetricsRow } from '../types';
import { getStoredModel, getEffectiveApiKey } from '../config/llm';
import { DATA_MAX_YEAR } from '../config';
import { sanitizeFilenameSegment } from '../utils/filename';
import { CountrySelector } from './CountrySelector';
import { useToast } from './ToastProvider';
import {
  ILO_INDUSTRY_SECTORS_GRANULAR,
  DEFAULT_INDUSTRY_DIVISION_CODE,
  getIndustryDivisionLabelShort,
} from '../data/iloIndustrySectors';

/** Parsed chart data: exactly 5 bullet strings per force for the Porter 5 chart visualization */
export interface Porter5ChartData {
  threatOfNewEntrants: string[];
  supplierPower: string[];
  buyerPower: string[];
  threatOfSubstitutes: string[];
  competitiveRivalry: string[];
}

const CHART_START = '## Porter 5 Forces Chart Summary';
const CHART_END_MARKERS = ['\n---\n', '\n### Executive Summary', '\n## Executive Summary'];

const NEW_MARKET_ANALYSIS_HEADING = '## New Market Analysis';
const NEW_MARKET_ANALYSIS_HEADING_ALT = '### New Market Analysis';

/** Find start index of New Market Analysis block (## or ###) */
function findNewMarketAnalysisStart(text: string): number {
  const i = text.indexOf(NEW_MARKET_ANALYSIS_HEADING);
  const j = text.indexOf(NEW_MARKET_ANALYSIS_HEADING_ALT);
  if (i === -1) return j;
  if (j === -1) return i;
  return Math.min(i, j);
}

/** Extract "New Market Analysis" block: exactly 5 bullet points; return bullets and text without block. Skips optional intro paragraph(s) before bullets. */
function parseNewMarketAnalysis(text: string): { bullets: string[]; textWithoutBlock: string } {
  const idx = findNewMarketAnalysisStart(text);
  if (idx === -1) return { bullets: [], textWithoutBlock: text };

  const headingLength = text.slice(idx).startsWith('## ')
    ? NEW_MARKET_ANALYSIS_HEADING.length
    : NEW_MARKET_ANALYSIS_HEADING_ALT.length;
  const afterHeading = text.slice(idx + headingLength);
  const lines = afterHeading.split('\n');
  const bullets: string[] = [];
  let lineIndex = 0;
  while (lineIndex < lines.length && !/^[-*]\s+/.test(lines[lineIndex]?.trim() ?? '')) {
    lineIndex++;
  }
  while (lineIndex < lines.length && bullets.length < 5) {
    const trimmed = (lines[lineIndex] ?? '').trim();
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      bullets.push(bulletMatch[1].trim());
    }
    lineIndex++;
  }
  const consumedLines = lines.slice(0, lineIndex);
  const blockEndOffset = consumedLines.join('\n').length;
  const blockStart = idx;
  const blockEnd = idx + headingLength + blockEndOffset;
  const before = text.slice(0, blockStart).trimEnd();
  const after = text.slice(blockEnd).trimStart();
  const textWithoutBlock = [before, after].filter(Boolean).join('\n\n');
  return { bullets, textWithoutBlock };
}

const KEY_TAKEAWAYS_HEADING = '## Key Takeaways';
const KEY_TAKEAWAYS_HEADING_ALT = '### Key Takeaways';

/** Find start index of Key Takeaways block (## or ###) */
function findKeyTakeawaysStart(text: string): number {
  const i = text.indexOf(KEY_TAKEAWAYS_HEADING);
  const j = text.indexOf(KEY_TAKEAWAYS_HEADING_ALT);
  if (i === -1) return j;
  if (j === -1) return i;
  return Math.min(i, j);
}

/** Extract "Key Takeaways" block: exactly 5 bullet points; return bullets and text without block. Skips optional intro paragraph(s) before bullets. */
function parseKeyTakeaways(text: string): { bullets: string[]; textWithoutBlock: string } {
  const idx = findKeyTakeawaysStart(text);
  if (idx === -1) return { bullets: [], textWithoutBlock: text };

  const headingLength = text.slice(idx).startsWith('## ')
    ? KEY_TAKEAWAYS_HEADING.length
    : KEY_TAKEAWAYS_HEADING_ALT.length;
  const afterHeading = text.slice(idx + headingLength);
  const lines = afterHeading.split('\n');
  const bullets: string[] = [];
  let lineIndex = 0;
  while (lineIndex < lines.length && !/^[-*]\s+/.test(lines[lineIndex]?.trim() ?? '')) {
    lineIndex++;
  }
  while (lineIndex < lines.length && bullets.length < 5) {
    const trimmed = (lines[lineIndex] ?? '').trim();
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      bullets.push(bulletMatch[1].trim());
    }
    lineIndex++;
  }
  const consumedLines = lines.slice(0, lineIndex);
  const blockEndOffset = consumedLines.join('\n').length;
  const blockStart = idx;
  const blockEnd = idx + headingLength + blockEndOffset;
  const before = text.slice(0, blockStart).trimEnd();
  const after = text.slice(blockEnd).trimStart();
  const textWithoutBlock = [before, after].filter(Boolean).join('\n\n');
  return { bullets, textWithoutBlock };
}

const RECOMMENDATIONS_HEADING = '## Recommendations';
const RECOMMENDATIONS_HEADING_ALT = '### Recommendations';

/** Find start index of Recommendations block (## or ###) */
function findRecommendationsStart(text: string): number {
  const i = text.indexOf(RECOMMENDATIONS_HEADING);
  const j = text.indexOf(RECOMMENDATIONS_HEADING_ALT);
  if (i === -1) return j;
  if (j === -1) return i;
  return Math.min(i, j);
}

/** Extract "Recommendations" block: exactly 5 bullet points; return bullets and text without block. Skips optional intro paragraph(s) before bullets. */
function parseRecommendations(text: string): { bullets: string[]; textWithoutBlock: string } {
  const idx = findRecommendationsStart(text);
  if (idx === -1) return { bullets: [], textWithoutBlock: text };

  const headingLength = text.slice(idx).startsWith('## ')
    ? RECOMMENDATIONS_HEADING.length
    : RECOMMENDATIONS_HEADING_ALT.length;
  const afterHeading = text.slice(idx + headingLength);
  const lines = afterHeading.split('\n');
  const bullets: string[] = [];
  let lineIndex = 0;
  while (lineIndex < lines.length && !/^[-*]\s+/.test(lines[lineIndex]?.trim() ?? '')) {
    lineIndex++;
  }
  while (lineIndex < lines.length && bullets.length < 5) {
    const trimmed = (lines[lineIndex] ?? '').trim();
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      bullets.push(bulletMatch[1].trim());
    }
    lineIndex++;
  }
  const consumedLines = lines.slice(0, lineIndex);
  const blockEndOffset = consumedLines.join('\n').length;
  const blockStart = idx;
  const blockEnd = idx + headingLength + blockEndOffset;
  const before = text.slice(0, blockStart).trimEnd();
  const after = text.slice(blockEnd).trimStart();
  const textWithoutBlock = [before, after].filter(Boolean).join('\n\n');
  return { bullets, textWithoutBlock };
}

/** Remove a single trailing paragraph (no ## heading) that appears after the main analysis – avoids showing stray text between sections */
function stripTrailingOrphanParagraph(text: string): string {
  const parts = text.split(/\n\n+/);
  if (parts.length <= 1) return text;
  const last = parts[parts.length - 1]?.trim() ?? '';
  if (!last) return text;
  if (/^#{2,3}\s/m.test(last)) return text;
  if (last.length > 600) return text;
  parts.pop();
  return parts.join('\n\n').trimEnd();
}

/** Extract chart summary block and parsed bullets; returns null if block not found or malformed */
function parsePorter5ChartSummary(analysis: string): {
  chartData: Porter5ChartData | null;
  textWithoutChart: string;
} {
  const idx = analysis.indexOf(CHART_START);
  if (idx === -1) {
    return { chartData: null, textWithoutChart: analysis };
  }

  const afterChartStart = analysis.slice(idx + CHART_START.length);
  let endIdx = afterChartStart.length;
  for (const marker of CHART_END_MARKERS) {
    const i = afterChartStart.indexOf(marker);
    if (i !== -1 && i < endIdx) endIdx = i;
  }
  const chartBlock = afterChartStart.slice(0, endIdx).trim();
  const textWithoutChart =
    analysis.slice(0, idx).trim() + afterChartStart.slice(endIdx).trim();

  const sections = chartBlock.split(/\n###\s+/).filter(Boolean);
  const result: Porter5ChartData = {
    threatOfNewEntrants: [],
    supplierPower: [],
    buyerPower: [],
    threatOfSubstitutes: [],
    competitiveRivalry: [],
  };

  const forceKeys: (keyof Porter5ChartData)[] = [
    'threatOfNewEntrants',
    'supplierPower',
    'buyerPower',
    'threatOfSubstitutes',
    'competitiveRivalry',
  ];
  const forcePatterns = [
    /1\.\s*Threat of new entrants/i,
    /2\.\s*Bargaining power of suppliers/i,
    /3\.\s*Bargaining power of buyers/i,
    /4\.\s*Threat of substitutes/i,
    /5\.\s*Competitive rivalry/i,
  ];

  for (const section of sections) {
    const lines = section.split('\n').map((l) => l.trim()).filter(Boolean);
    const title = lines[0] ?? '';
    const bulletLines = lines.slice(1).filter((l) => /^[-*]\s+/.test(l)).slice(0, 5);
    const bullets = bulletLines.map((l) => l.replace(/^[-*]\s+/, '').trim());

    for (let i = 0; i < forcePatterns.length; i++) {
      if (forcePatterns[i].test(title)) {
        result[forceKeys[i]] = bullets;
        break;
      }
    }
  }

  const allHaveAtLeastOne = forceKeys.every((k) => result[k].length >= 1);
  const chartData = allHaveAtLeastOne ? result : null;
  return { chartData, textWithoutChart };
}

/** Porter 5 chart: center = Competitive Rivalry, top/left/right/bottom = other four forces */
function Porter5Chart({ data }: { data: Porter5ChartData }) {
  return (
    <figure className="porter5-chart" aria-label="Porter Five Forces analysis chart">
      <figcaption className="porter5-chart-caption">
        <span className="porter5-chart-caption-label">Competitive analysis</span>
        <h3 className="porter5-chart-title">Porter&apos;s Five Forces Analysis</h3>
      </figcaption>
      <div className="porter5-chart-grid">
        <div className="porter5-chart-cell porter5-chart-top">
          <article className="porter5-chart-card porter5-chart-card--entry">
            <div className="porter5-chart-card__accent" aria-hidden />
            <header className="porter5-chart-card__header">
              <span className="porter5-chart-card__badge">1</span>
              <h4 className="porter5-chart-card__title">Threat of New Entry</h4>
            </header>
            <ul className="porter5-chart-card__list">
              {data.threatOfNewEntrants.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <div className="porter5-chart-connector porter5-chart-connector--down" aria-hidden />
          </article>
        </div>
        <div className="porter5-chart-cell porter5-chart-left">
          <article className="porter5-chart-card porter5-chart-card--supplier">
            <div className="porter5-chart-card__accent" aria-hidden />
            <header className="porter5-chart-card__header">
              <span className="porter5-chart-card__badge">2</span>
              <h4 className="porter5-chart-card__title">Supplier Power</h4>
            </header>
            <ul className="porter5-chart-card__list">
              {data.supplierPower.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <div className="porter5-chart-connector porter5-chart-connector--right" aria-hidden />
          </article>
        </div>
        <div className="porter5-chart-cell porter5-chart-center">
          <article className="porter5-chart-card porter5-chart-card--center">
            <header className="porter5-chart-card__header">
              <span className="porter5-chart-card__badge porter5-chart-card__badge--center">5</span>
              <h4 className="porter5-chart-card__title">Competitive Rivalry</h4>
            </header>
            <ul className="porter5-chart-card__list">
              {data.competitiveRivalry.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </article>
        </div>
        <div className="porter5-chart-cell porter5-chart-right">
          <article className="porter5-chart-card porter5-chart-card--buyer">
            <div className="porter5-chart-card__accent" aria-hidden />
            <header className="porter5-chart-card__header">
              <span className="porter5-chart-card__badge">3</span>
              <h4 className="porter5-chart-card__title">Buyer Power</h4>
            </header>
            <ul className="porter5-chart-card__list">
              {data.buyerPower.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <div className="porter5-chart-connector porter5-chart-connector--left" aria-hidden />
          </article>
        </div>
        <div className="porter5-chart-cell porter5-chart-bottom">
          <article className="porter5-chart-card porter5-chart-card--substitute">
            <div className="porter5-chart-card__accent" aria-hidden />
            <header className="porter5-chart-card__header">
              <span className="porter5-chart-card__badge">4</span>
              <h4 className="porter5-chart-card__title">Threat of Substitution</h4>
            </header>
            <ul className="porter5-chart-card__list">
              {data.threatOfSubstitutes.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <div className="porter5-chart-connector porter5-chart-connector--up" aria-hidden />
          </article>
        </div>
      </div>
    </figure>
  );
}

interface Porter5ForcesSectionProps {
  dashboardData?: CountryDashboardData | null;
  refreshTrigger?: number;
  setCountryCode: (code: string) => void;
}

/** Strip trailing "Sources" section so only inline citations remain. */
function stripOptionalSourcesSection(text: string): string {
  const sourcesHeading = /(\n|^)(#{2,3})\s*Sources?\s*\n/i;
  const match = text.match(sourcesHeading);
  if (!match) return text;
  const idx = match.index! + match[1].length;
  return text.slice(0, idx).trimEnd();
}

/** Simple markdown-like formatting: headers, bold, links */
function formatPorterContent(text: string): React.ReactNode {
  const cleaned = stripOptionalSourcesSection(text);
  const lines = cleaned.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      elements.push(<br key={key++} />);
      continue;
    }
    if (line.trim() === '---') continue;
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={key++} className="porter-h4">
          {line.slice(4)}
        </h4>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key++} className="porter-h3">
          {line.slice(3)}
        </h3>,
      );
      continue;
    }
    elements.push(
      <p key={key++} className="porter-p">
        {formatInlineMarkdown(line)}
      </p>,
    );
  }
  return <div className="porter-content-inner">{elements}</div>;
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
          className="porter-link"
        >
          {linkMatch[1]}
        </a>,
      );
      remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
    } else if (boldMatch && boldMatch.index !== undefined) {
      const before = remaining.slice(0, boldMatch.index);
      if (before) parts.push(before);
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function Porter5ForcesSection({
  dashboardData,
  refreshTrigger = 0,
  setCountryCode,
}: Porter5ForcesSectionProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalCountryMetricsRow[]>([]);
  const { showToast, updateToast, dismissToast } = useToast();
  const [industrySectorId, setIndustrySectorId] = useState<string>(DEFAULT_INDUSTRY_DIVISION_CODE);
  const porter5ChartRef = useRef<HTMLDivElement | null>(null);

  const globalDataYear = DATA_MAX_YEAR;

  useEffect(() => {
    if (!dashboardData) return;
    let cancelled = false;
    fetchGlobalCountryMetricsForYear(globalDataYear).then((rows) => {
      if (!cancelled) setGlobalMetrics(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [dashboardData, globalDataYear, refreshTrigger]);

  const generateAnalysis = useCallback(async () => {
    if (!dashboardData) {
      setError('Please select a country in the Country dashboard first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setSource(null);

    const start = performance.now();
    const loadingToastId = showToast({
      type: 'loading',
      message: 'Generating Porter 5 Forces analysis… (0%)',
    });

    const model = getStoredModel();
    const apiKey = getEffectiveApiKey(model);
    const systemPrompt = buildPorter5ForcesSystemPrompt(
      dashboardData,
      globalMetrics,
      globalDataYear,
      industrySectorId,
    );
    const industryLabel = getIndustryDivisionLabelShort(industrySectorId);
    const userMessage = `Generate a Porter Five Forces analysis for ${dashboardData.summary.name} in the ${industryLabel} sector. Start with the "Porter 5 Forces Chart Summary" block: exactly 5 bullet points (short sentences) under each of the five force headings, then one paragraph Executive Summary, then exactly two paragraphs for each force (Threat of new entrants, Bargaining power of suppliers, Bargaining power of buyers, Threat of substitutes, Competitive rivalry). Then add "New Market Analysis": ## New Market Analysis followed by exactly 5 concise bullet points for the new market. Then add "Key Takeaways": ## Key Takeaways followed by exactly 5 concise bullet points that summarise strategic takeaways. Then add "Recommendations": ## Recommendations followed by exactly 5 concise, actionable bullet points based on the five forces analysis. Use the data and context provided. Do not include "---" or horizontal rules in your response.`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          systemPrompt,
          model,
          supplementWithWebSearch: true,
          porter5ForcesRequest: true,
          dashboardSnapshot: {
            countryName: dashboardData.summary.name,
            year: dashboardData.latestSnapshot?.year ?? dashboardData.range.endYear,
            metrics: dashboardData.latestSnapshot?.metrics,
          },
          industrySector: industryLabel,
          globalData: globalMetrics.length > 0 ? globalMetrics : undefined,
          globalDataByYear:
            globalMetrics.length > 0 ? { [globalDataYear]: globalMetrics } : undefined,
          ...(apiKey && { apiKey }),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { content?: string; source?: string };
      setAnalysis(data.content ?? 'No response generated.');
      setSource(data.source ?? null);
      const seconds = Math.max((performance.now() - start) / 1000, 0.1).toFixed(1);
      updateToast(loadingToastId, {
        type: 'success',
        message: `Porter 5 Forces analysis generated (100%, ${seconds}s).`,
        durationMs: 6000,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate Porter 5 Forces analysis.');
      const seconds = Math.max((performance.now() - start) / 1000, 0.1).toFixed(1);
      updateToast(loadingToastId, {
        type: 'error',
        message: `Failed to generate Porter 5 Forces analysis (0%, ${seconds}s).`,
        durationMs: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [dashboardData, globalMetrics, industrySectorId, globalDataYear, showToast, updateToast, dismissToast]);

  const downloadChartAsImage = useCallback(async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    const el = ref.current;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Porter 5 Forces chart export failed:', err);
    }
  }, []);

  const handleDownloadPorter5Chart = useCallback(() => {
    const name = sanitizeFilenameSegment(dashboardData?.summary?.name ?? 'Country');
    const latestYear = new Date().getFullYear();
    const industryLabel = getIndustryDivisionLabelShort(industrySectorId);
    const industrySegment = sanitizeFilenameSegment(industryLabel);
    downloadChartAsImage(
      porter5ChartRef,
      `Porter5-Forces-${name}-${industrySegment}-${latestYear}.png`,
    );
  }, [dashboardData?.summary?.name, dashboardData?.latestSnapshot?.year, dashboardData?.range, industrySectorId, downloadChartAsImage]);

  return (
    <section className="card porter5-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Porter Five Forces</h2>
          <p className="muted">
            Industry attractiveness analysis (Threat of new entrants, Bargaining power of suppliers,
            Bargaining power of buyers, Threat of substitutes, Competitive rivalry) for the selected
            country and ILO/ISIC industry sector. Uses the same platform data (World Bank, UN, WHO, IMF; year {DATA_MAX_YEAR}) and
            supplementary information from TAVILY, GROQ, or other LLMs.
          </p>
        </div>
      </div>

      <div className="porter5-controls">
        <div className="porter5-country-selector">
          <CountrySelector
            setCountryCode={setCountryCode}
            data={dashboardData ?? undefined}
          />
        </div>
        <div className="porter5-industry-selector">
          <label htmlFor="porter5-industry" className="porter5-industry-label">
            Industry / sector (ILO–ISIC division)
          </label>
          <select
            id="porter5-industry"
            className="porter5-industry-select"
            value={industrySectorId}
            onChange={(e) => setIndustrySectorId(e.target.value)}
            aria-label="Select industry or sector (ILO/ISIC granular)"
          >
            {ILO_INDUSTRY_SECTORS_GRANULAR.map((section) => (
              <optgroup key={section.sectionLetter} label={`Section ${section.sectionLetter} – ${section.sectionLabel}`}>
                {section.divisions.map((div) => (
                  <option key={div.code} value={div.code}>
                    {div.code} – {div.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="porter5-generate-btn"
          onClick={generateAnalysis}
          disabled={isLoading || !dashboardData}
          aria-label="Generate Porter Five Forces analysis"
        >
          {isLoading ? (
            <>
              <span className="porter5-spinner" aria-hidden />
              Generating
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
              Generate Porter 5 Forces Analysis
            </>
          )}
        </button>
      </div>

      {!dashboardData && (
        <p className="porter5-hint muted">
          Select a country in the <strong>Country dashboard</strong> tab, then return here to
          choose an industry/sector and generate the analysis.
        </p>
      )}

      {error && (
        <div className="porter5-error" role="alert">
          {error}
        </div>
      )}

      {analysis && (
        <>
          {(() => {
            const { chartData, textWithoutChart } = parsePorter5ChartSummary(analysis);
            const { bullets: newMarketBullets, textWithoutBlock: textAfterNewMarket } =
              parseNewMarketAnalysis(textWithoutChart);
            const { bullets: keyTakeawaysBullets, textWithoutBlock: textAfterKeyTakeaways } =
              parseKeyTakeaways(textAfterNewMarket);
            const { bullets: recommendationsBullets, textWithoutBlock: textBeforeComprehensive } =
              parseRecommendations(textAfterKeyTakeaways);
            const comprehensiveText = stripTrailingOrphanParagraph(textBeforeComprehensive);
            return (
              <>
                {chartData && (
                  <div className="porter5-chart-section" role="region" aria-label="Porter Five Forces Analysis chart">
                    <div className="porter5-chart-section-toolbar">
                      <button
                        type="button"
                        className="pestel-chart-download-btn summary-download-icon-btn"
                        onClick={handleDownloadPorter5Chart}
                        aria-label="Download Porter Five Forces chart as high-resolution PNG"
                        title="Download chart as high-resolution PNG"
                      >
                        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden focusable="false">
                          <path
                            fill="currentColor"
                            d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L7.25 8.44V2.25A.75.75 0 0 1 8 1.5Zm-4 9a.75.75 0 0 1 .75.75v1.25c0 .14.11.25.25.25h6a.25.25 0 0 0 .25-.25v-1.25a.75.75 0 0 1 1.5 0v1.25A1.75 1.75 0 0 1 11 14.5H5A1.75 1.75 0 0 1 3.25 12.75v-1.25A.75.75 0 0 1 4 10.5Z"
                          />
                        </svg>
                      </button>
                    </div>
                    <div ref={porter5ChartRef} className="porter5-chart-capture-area">
                      <div className="porter5-chart-wrapper">
                        <Porter5Chart data={chartData} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="porter5-sections">
                <div className="porter5-output porter5-comprehensive" role="article" aria-label="Porter Five Forces Comprehensive Analysis">
                  <h3 className="porter5-output-title">Comprehensive Analysis</h3>
                  <div className="porter5-content">{formatPorterContent(comprehensiveText)}</div>
                  {source && (
                    <p className="porter5-source muted">
                      Source: {source}
                    </p>
                  )}
                </div>
                {newMarketBullets.length > 0 && (
                  <div className="porter5-output porter5-new-market" role="article" aria-label="New Market Analysis">
                    <h3 className="porter5-output-title">New Market Analysis</h3>
                    <ul className="porter5-new-market-list">
                      {newMarketBullets.map((b, i) => (
                        <li key={i}>{formatInlineMarkdown(b)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {keyTakeawaysBullets.length > 0 && (
                  <div className="porter5-output porter5-key-takeaways" role="article" aria-label="Key Takeaways">
                    <h3 className="porter5-output-title">Key Takeaways</h3>
                    <ul className="porter5-key-takeaways-list">
                      {keyTakeawaysBullets.map((b, i) => (
                        <li key={i}>{formatInlineMarkdown(b)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {recommendationsBullets.length > 0 && (
                  <div className="porter5-output porter5-recommendations" role="article" aria-label="Recommendations">
                    <h3 className="porter5-output-title">Recommendations</h3>
                    <ul className="porter5-recommendations-list">
                      {recommendationsBullets.map((b, i) => (
                        <li key={i}>{formatInlineMarkdown(b)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                </div>
              </>
            );
          })()}
        </>
      )}
    </section>
  );
}
