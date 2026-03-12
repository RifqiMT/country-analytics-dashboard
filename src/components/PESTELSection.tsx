import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { buildPestelSystemPrompt } from '../utils/pestelContext';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';
import { sanitizeFilenameSegment } from '../utils/filename';
import type { CountryDashboardData, GlobalCountryMetricsRow } from '../types';
import { getStoredModel, getEffectiveApiKey } from '../config/llm';
import { DATA_MAX_YEAR } from '../config';
import { CountrySelector } from './CountrySelector';
import { useToast } from './ToastProvider';
import {
  getAnswerPersonaName,
  getAnswerSourceInfo,
  renderAnswerSourceIcon,
} from './ChatbotSection';

/** Parsed bullet points per PESTEL pillar for the chart view */
export interface PestelChartData {
  political: string[];
  economic: string[];
  sociocultural: string[];
  technological: string[];
  environmental: string[];
  legal: string[];
}

const PESTEL_HEADERS = [
  { key: 'political', title: 'Political', letter: 'P' },
  { key: 'economic', title: 'Economic', letter: 'E' },
  { key: 'sociocultural', title: 'Sociocultural', letter: 'S' },
  { key: 'technological', title: 'Technological', letter: 'T' },
  { key: 'environmental', title: 'Environmental', letter: 'E' },
  { key: 'legal', title: 'Legal', letter: 'L' },
] as const;

/** Extract section content between two ### headers. Returns text up to next ### or end. */
function getSectionContent(full: string, sectionTitle: string): string {
  const patterns = [
    new RegExp(`###\\s*${sectionTitle}\\s*factors?\\s*\\n([\\s\\S]*?)(?=###|$)`, 'i'),
    new RegExp(`##\\s*${sectionTitle}\\s*factors?\\s*\\n([\\s\\S]*?)(?=##|$)`, 'i'),
  ];
  for (const re of patterns) {
    const m = full.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return '';
}

/** Turn section text into up to 5 short bullet points (from existing bullets or sentence splits). */
function sectionToBullets(text: string, maxBullets = 5): string[] {
  const bullets: string[] = [];
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const bullet = line.replace(/^[-*]\s*/, '').trim();
    if (!bullet) continue;
    if (bullet.length > 120) {
      const sentences = bullet.split(/(?<=[.!?])\s+/).filter(Boolean);
      for (const s of sentences.slice(0, maxBullets - bullets.length)) {
        const t = s.trim();
        if (t.length > 15) bullets.push(t);
      }
    } else {
      bullets.push(bullet);
    }
    if (bullets.length >= maxBullets) break;
  }
  if (bullets.length === 0 && text.length > 20) {
    const sentences = text.replace(/\n/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
    for (const s of sentences.slice(0, maxBullets)) {
      const t = s.trim();
      if (t.length > 15) bullets.push(t);
    }
  }
  return bullets.slice(0, maxBullets);
}

/** Parse full PESTEL analysis into per-pillar bullet points for the chart. */
export function parsePestelBullets(analysis: string): PestelChartData {
  const sections: Record<string, string> = {
    political: getSectionContent(analysis, 'Political'),
    economic: getSectionContent(analysis, 'Economic'),
    sociocultural: getSectionContent(analysis, 'Social'),
    technological: getSectionContent(analysis, 'Technological'),
    environmental: getSectionContent(analysis, 'Environmental'),
    legal: getSectionContent(analysis, 'Legal'),
  };
  return {
    political: sectionToBullets(sections.political),
    economic: sectionToBullets(sections.economic),
    sociocultural: sectionToBullets(sections.sociocultural),
    technological: sectionToBullets(sections.technological),
    environmental: sectionToBullets(sections.environmental),
    legal: sectionToBullets(sections.legal),
  };
}

export interface SwotChartData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

/** Split paragraphs into one bullet per sentence (up to maxBullets). */
function paragraphsToSentenceBullets(
  paragraphs: string[],
  stripMd: (s: string) => string,
  maxBullets = 24,
): string[] {
  const out: string[] = [];
  for (const p of paragraphs) {
    if (out.length >= maxBullets) break;
    const normalized = p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
    for (const s of sentences) {
      if (out.length >= maxBullets) break;
      const t = stripMd(s.trim());
      if (t.length >= 15) out.push(t.length <= 320 ? t : t.slice(0, 320));
    }
  }
  return out;
}

function getSwotBlock(analysis: string, headerPattern: string): string[] {
  const stripMd = (s: string) => s.replace(/\*\*[^*]+\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
  let rawText = '';
  const paragraphs: string[] = [];
  const addFromText = (text: string) => {
    rawText = text.trim();
    const lines = rawText.split(/\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const b = stripMd(line.replace(/^[-*]\s*/, '').trim());
      if (b.length > 10) paragraphs.push(b);
    }
  };
  const escaped = headerPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reBold = new RegExp('\\*\\*\\s*' + escaped + '\\s*\\*\\*:?\\s*[\\n\\r]*([\\s\\S]*?)(?=\\*\\*|###|##|$)', 'i');
  const mBold = analysis.match(reBold);
  if (mBold?.[1]) addFromText(mBold[1]);
  const reHeader = new RegExp('(?:###|##)\\s*' + escaped + '\\s*[\\n\\r]+([\\s\\S]*?)(?=(?:###|##)\\s|\\*\\*|$)', 'i');
  const mHeader = analysis.match(reHeader);
  if (mHeader?.[1] && paragraphs.length === 0) addFromText(mHeader[1]);
  if (paragraphs.length > 0) return paragraphsToSentenceBullets(paragraphs, stripMd, 24);
  if (rawText.length > 30) {
    const bullets = paragraphsToSentenceBullets(
      rawText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean).map((s) => s.trim()).filter((s) => s.length >= 15),
      stripMd,
      24,
    );
    if (bullets.length > 0) return bullets;
    const one = stripMd(rawText.replace(/\n/g, ' ').trim());
    if (one.length > 40) return [one.length <= 320 ? one : one.slice(0, 320)];
  }
  return [];
}

function getSwotBlockMulti(analysis: string, patterns: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of patterns) {
    for (const b of getSwotBlock(analysis, p)) {
      const key = b.slice(0, 80).toLowerCase();
      if (!seen.has(key)) { seen.add(key); result.push(b); }
    }
    if (result.length >= 24) break;
  }
  return result.slice(0, 24);
}

function parseSwotSectionFallback(analysis: string): SwotChartData {
  const stripMd = (s: string) => s.replace(/\*\*[^*]+\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
  let section = analysis.match(/(?:Strategic implications|PESTEL[-\u2013]SWOT matrix|SWOT matrix)[\s\S]*?(?=###\s*New market|###\s*Key takeaways|###\s*Recommendations|###\s*Sources|$)/i)?.[0] ?? '';
  if (section.length < 50) {
    const strengthsIdx = analysis.search(/\*\*\s*Strengths\s*\*?\*?:?/i);
    if (strengthsIdx >= 0) {
      const after = analysis.slice(strengthsIdx);
      const endIdx = after.search(/\n###\s*(?:New market|Key takeaways|Recommendations|Sources)/i);
      section = endIdx >= 0 ? after.slice(0, endIdx) : after;
    }
  }
  const parts: Record<keyof SwotChartData, string> = { strengths: '', weaknesses: '', opportunities: '', threats: '' };
  const splitPoints: { key: keyof SwotChartData; re: RegExp }[] = [
    { key: 'strengths', re: /\*\*\s*Strengths\s*\*?\*?:?\s*[\n\r]*/i },
    { key: 'weaknesses', re: /\*\*\s*Weaknesses\s*\*?\*?:?\s*[\n\r]*/i },
    { key: 'opportunities', re: /\*\*\s*Opportunities\s*\*?\*?:?\s*[\n\r]*/i },
    { key: 'threats', re: /\*\*\s*(?:Risks\s+and\s+challenges|Threats|Risks)\s*\*?\*?:?\s*[\n\r]*/i },
  ];
  for (let i = 0; i < splitPoints.length; i++) {
    const { key, re } = splitPoints[i];
    const m = section.match(re);
    if (!m || m.index == null) continue;
    const start = m.index + m[0].length;
    const nextIdx = splitPoints.slice(i + 1).map(({ re: r }) => section.slice(start).search(r)).find((idx) => idx >= 0);
    const end = nextIdx !== undefined && nextIdx >= 0 ? start + nextIdx : section.length;
    parts[key] = section.slice(start, end).trim();
  }
  const toBullets = (text: string): string[] => {
    if (text.length < 20) return [];
    const normalized = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
    const bullets: string[] = [];
    for (const s of sentences.slice(0, 24)) {
      const t = stripMd(s.trim());
      if (t.length >= 15) bullets.push(t.length <= 320 ? t : t.slice(0, 320));
    }
    if (bullets.length === 0 && normalized.length > 40) bullets.push(normalized.length <= 320 ? normalized : normalized.slice(0, 320));
    return bullets;
  };
  return {
    strengths: toBullets(parts.strengths),
    weaknesses: toBullets(parts.weaknesses),
    opportunities: toBullets(parts.opportunities),
    threats: toBullets(parts.threats),
  };
}

export function parseSwotBullets(analysis: string): SwotChartData {
  const primary = {
    strengths: getSwotBlockMulti(analysis, ['Strengths']),
    weaknesses: getSwotBlockMulti(analysis, ['Weaknesses']),
    opportunities: getSwotBlockMulti(analysis, ['Opportunities']),
    threats: getSwotBlockMulti(analysis, ['Risks and challenges', 'Threats', 'Risks']),
  };
  const hasAny = primary.strengths.length > 0 || primary.weaknesses.length > 0 || primary.opportunities.length > 0 || primary.threats.length > 0;
  if (hasAny) return primary;
  const fallback = parseSwotSectionFallback(analysis);
  return {
    strengths: fallback.strengths.length > 0 ? fallback.strengths : primary.strengths,
    weaknesses: fallback.weaknesses.length > 0 ? fallback.weaknesses : primary.weaknesses,
    opportunities: fallback.opportunities.length > 0 ? fallback.opportunities : primary.opportunities,
    threats: fallback.threats.length > 0 ? fallback.threats : primary.threats,
  };
}

/** Extract the Strategic implications (PESTEL–SWOT matrix) block from the full analysis. */
function getStrategicImplicationsBlock(analysis: string): string {
  const match = analysis.match(/(###\s*Strategic\s+implications[\s\S]*?)(?=###\s*New market|###\s*Key takeaways|###\s*Recommendations|###\s*Sources|$)/i);
  return match ? match[1].trim() : '';
}

/** Return the full report with the Strategic implications block removed. */
function getReportWithoutStrategicImplications(analysis: string): string {
  const block = getStrategicImplicationsBlock(analysis);
  if (!block) return analysis;
  const idx = analysis.indexOf(block);
  if (idx < 0) return analysis;
  const before = analysis.slice(0, idx).trimEnd();
  const after = analysis.slice(idx + block.length).replace(/^\s*[\n\r]+/, '');
  return (before + '\n\n' + after).trim();
}

/** Extract the New market analysis block from the full analysis. */
function getNewMarketAnalysisBlock(analysis: string): string {
  const match = analysis.match(/(###\s*New\s+market\s+analysis[\s\S]*?)(?=###\s*Key takeaways|###\s*Recommendations|###\s*Sources|$)/i);
  return match ? match[1].trim() : '';
}

/** Return the given report string with the New market analysis block removed. */
function getReportWithoutNewMarketAnalysis(report: string): string {
  const block = getNewMarketAnalysisBlock(report);
  if (!block) return report;
  const idx = report.indexOf(block);
  if (idx < 0) return report;
  const before = report.slice(0, idx).trimEnd();
  const after = report.slice(idx + block.length).replace(/^\s*[\n\r]+/, '');
  return (before + '\n\n' + after).trim();
}

/** Extract the Key takeaways block from the full analysis. */
function getKeyTakeawaysBlock(analysis: string): string {
  const match = analysis.match(/(###\s*Key\s+takeaways[\s\S]*?)(?=###\s*Recommendations|###\s*Sources|$)/i);
  return match ? match[1].trim() : '';
}

/** Return the given report string with the Key takeaways block removed. */
function getReportWithoutKeyTakeaways(report: string): string {
  const block = getKeyTakeawaysBlock(report);
  if (!block) return report;
  const idx = report.indexOf(block);
  if (idx < 0) return report;
  const before = report.slice(0, idx).trimEnd();
  const after = report.slice(idx + block.length).replace(/^\s*[\n\r]+/, '');
  return (before + '\n\n' + after).trim();
}

/** Extract the Recommendations block from the full analysis. */
function getRecommendationsBlock(analysis: string): string {
  const match = analysis.match(/(###\s*Recommendations[\s\S]*?)(?=###\s*Sources|$)/i);
  return match ? match[1].trim() : '';
}

/** Return the given report string with the Recommendations block removed. */
function getReportWithoutRecommendations(report: string): string {
  const block = getRecommendationsBlock(report);
  if (!block) return report;
  const idx = report.indexOf(block);
  if (idx < 0) return report;
  const before = report.slice(0, idx).trimEnd();
  const after = report.slice(idx + block.length).replace(/^\s*[\n\r]+/, '');
  return (before + '\n\n' + after).trim();
}

/** Strip the leading ### header line from a block to avoid duplicating the section title in the UI. */
function stripLeadingH3(block: string): string {
  return block.replace(/^###\s+[^\n]+\n+/i, '').trim();
}

/** Strip leading "Comprehensive PESTEL Analysis for [Country]" line from report content (LLM often adds this title). */
function stripLeadingComprehensivePestelTitle(text: string): string {
  return text.replace(/^(?:#+\s*)?Comprehensive\s+PESTEL\s+Analysis\s+for\s+[^\n]+\s*\n*/i, '').trimStart();
}

interface PESTELSectionProps {
  dashboardData?: CountryDashboardData | null;
  /** Increment to force refetch of global data used for PESTEL (e.g. after "Refresh all data"). */
  refreshTrigger?: number;
  setCountryCode: (code: string) => void;
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

  return <div className="pestel-content-inner">{elements}</div>;
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

const PESTEL_CHART_COLORS = [
  { header: '#1e3a5f', bg: 'rgba(30, 58, 95, 0.12)' },
  { header: '#0d5c2e', bg: 'rgba(13, 92, 46, 0.12)' },
  { header: '#8b6914', bg: 'rgba(139, 105, 20, 0.12)' },
  { header: '#b84a2b', bg: 'rgba(184, 74, 43, 0.12)' },
  { header: '#6b2d3c', bg: 'rgba(107, 45, 60, 0.12)' },
  { header: '#4a3c5c', bg: 'rgba(74, 60, 92, 0.12)' },
] as const;

function PestelChart({ analysis }: { analysis: string }) {
  const chartData = useMemo(() => parsePestelBullets(analysis), [analysis]);
  const hasAnyBullets = PESTEL_HEADERS.some((h) => chartData[h.key].length > 0);
  if (!hasAnyBullets) return null;
  return (
    <div className="pestel-chart">
      <h4 className="pestel-chart-title">PESTEL Analysis</h4>
      <p className="pestel-chart-subtitle muted">Summarized bullet points by macro-environmental factor.</p>
      <div className="pestel-chart-grid" role="list">
        {PESTEL_HEADERS.map(({ key, title, letter }, i) => {
          const bullets = chartData[key];
          const colors = PESTEL_CHART_COLORS[i];
          return (
            <div key={key} className="pestel-chart-col" role="listitem" aria-label={`${title}: ${bullets.length} points`}>
              <div className="pestel-chart-header" style={{ backgroundColor: colors.header, color: '#fff' }}>
                <span className="pestel-chart-header-letter" aria-hidden>{letter}</span>
                <span className="pestel-chart-header-name">{title.toUpperCase()}</span>
              </div>
              <div className="pestel-chart-body" style={{ backgroundColor: colors.bg }}>
                {bullets.length > 0 ? (
                  <ul className="pestel-chart-list">
                    {bullets.map((b, j) => (
                      <li key={j} className="pestel-chart-bullet">{b}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="pestel-chart-empty muted">No summary available.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SWOT_QUADRANTS = [
  { key: 'strengths', title: 'Strengths', letter: 'S' },
  { key: 'weaknesses', title: 'Weaknesses', letter: 'W' },
  { key: 'opportunities', title: 'Opportunities', letter: 'O' },
  { key: 'threats', title: 'Threats', letter: 'T' },
] as const;

const SWOT_CHART_COLORS = [
  { header: '#2d6a4f', bg: 'rgba(45, 106, 79, 0.12)' },
  { header: '#c2410c', bg: 'rgba(194, 65, 12, 0.12)' },
  { header: '#0369a1', bg: 'rgba(3, 105, 161, 0.12)' },
  { header: '#be123c', bg: 'rgba(190, 18, 60, 0.12)' },
];

function SwotChart({ analysis }: { analysis: string }) {
  const data = useMemo(() => parseSwotBullets(analysis), [analysis]);
  return (
    <div className="swot-chart">
      <h4 className="swot-chart-title">SWOT Analysis</h4>
      <p className="swot-chart-subtitle muted">Internal vs external, helpful vs harmful.</p>
      <div className="swot-chart-axes">
        <span className="swot-axis swot-axis-internal" aria-hidden>internal</span>
        <span className="swot-axis swot-axis-external" aria-hidden>external</span>
        <span className="swot-axis swot-axis-helpful" aria-hidden>helpful</span>
        <span className="swot-axis swot-axis-harmful" aria-hidden>harmful</span>
      </div>
      <div className="swot-chart-grid">
        {SWOT_QUADRANTS.map((q, i) => {
          const bullets = data[q.key];
          const colors = SWOT_CHART_COLORS[i];
          return (
            <div
              key={q.key}
              className="swot-chart-quadrant"
              style={{
                ['--swot-header' as string]: colors.header,
                ['--swot-bg' as string]: colors.bg,
              }}
            >
              <div className="swot-chart-quadrant-header">
                <span className="swot-chart-quadrant-title">{q.title}</span>
              </div>
              <div className="swot-chart-quadrant-body">
                {bullets.length > 0 ? (
                  <ul className="swot-chart-list">
                    {bullets.map((b, j) => (
                      <li key={j} className="swot-chart-bullet">{b}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="swot-chart-empty muted">No summary available. See full report below.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PESTELSection({
  dashboardData,
  refreshTrigger = 0,
  setCountryCode,
}: PESTELSectionProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalCountryMetricsRow[]>([]);
  const { showToast, updateToast, dismissToast } = useToast();

  const pestelChartRef = useRef<HTMLDivElement>(null);
  const swotChartRef = useRef<HTMLDivElement>(null);

  const strategicImplicationsBlock = useMemo(() => (analysis ? getStrategicImplicationsBlock(analysis) : ''), [analysis]);

  const newMarketAnalysisBlock = useMemo(() => (analysis ? getNewMarketAnalysisBlock(analysis) : ''), [analysis]);

  const keyTakeawaysBlock = useMemo(() => (analysis ? getKeyTakeawaysBlock(analysis) : ''), [analysis]);

  const recommendationsBlock = useMemo(() => (analysis ? getRecommendationsBlock(analysis) : ''), [analysis]);

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
      console.error('Chart export failed:', err);
    }
  }, []);

  const handleDownloadPestelChart = useCallback(() => {
    const name = sanitizeFilenameSegment(dashboardData?.summary?.name ?? 'Country');
    const latestYear = new Date().getFullYear();
    downloadChartAsImage(
      pestelChartRef,
      `PESTEL-Analysis-${name}-${latestYear}.png`,
    );
  }, [dashboardData?.summary?.name, dashboardData?.latestSnapshot?.year, dashboardData?.range, downloadChartAsImage]);

  const handleDownloadSwotChart = useCallback(() => {
    const name = sanitizeFilenameSegment(dashboardData?.summary?.name ?? 'Country');
    const latestYear = new Date().getFullYear();
    downloadChartAsImage(
      swotChartRef,
      `SWOT-Analysis-${name}-${latestYear}.png`,
    );
  }, [dashboardData?.summary?.name, dashboardData?.latestSnapshot?.year, dashboardData?.range, downloadChartAsImage]);

  // Always use the most up-to-date global data for PESTEL (peer comparison, etc.).
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
      message: 'Generating PESTEL analysis… (0%)',
    });

    const model = getStoredModel();
    const apiKey = getEffectiveApiKey(model);
    const systemPrompt = buildPestelSystemPrompt(dashboardData, globalMetrics, globalDataYear);
    const userMessage = `Generate a comprehensive PESTEL analysis for ${dashboardData.summary.name} based on the data provided. Follow the required structure: Executive summary, all six PESTEL factors (Political, Economic, Social, Technological, Environmental, Legal) with up to 2 summarized paragraphs each, Strategic implications for business (PESTEL–SWOT matrix: Strengths, Weaknesses, Opportunities, and Risks and challenges — write 2 paragraphs per element, no bullet lists), New market analysis (at least 5 bullet points), Key takeaways (at least 5 bullet points), and Recommendations (at least 5 bullet points). Use the exact numbers and time-series trends from the context. Keep each PESTEL element concise (max 2 paragraphs).`;

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
          // Pass latest global data so backend can use it; PESTEL uses DATA_MAX_YEAR for peer comparison and metrics.
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

      const data = (await res.json()) as {
        content?: string;
        source?: string;
      };
      setAnalysis(data.content ?? 'No response generated.');
      setSource(data.source ?? null);
      const seconds = Math.max((performance.now() - start) / 1000, 0.1).toFixed(1);
      updateToast(loadingToastId, {
        type: 'success',
        message: `PESTEL analysis generated (100%, ${seconds}s).`,
        durationMs: 6000,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PESTEL analysis.');
      const seconds = Math.max((performance.now() - start) / 1000, 0.1).toFixed(1);
      updateToast(loadingToastId, {
        type: 'error',
        message: `Failed to generate PESTEL analysis (0%, ${seconds}s).`,
        durationMs: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [dashboardData, globalMetrics, globalDataYear, showToast, updateToast, dismissToast]);

  return (
    <section className="card pestel-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">PESTEL Analysis</h2>
          <p className="muted">
            Comprehensive macro-environmental analysis (Political, Economic, Social, Technological, Environmental, Legal)
            with PESTEL–SWOT matrix (Opportunities and Risks), new market analysis, key takeaways, and actionable recommendations.
            Uses the same analyst-grade data as the platform (World Bank, UN, WHO, IMF; 2000 – latest) and supplements with web search for dimensions with limited dashboard data.
          </p>
        </div>
      </div>

      <div className="pestel-controls">
        <div className="pestel-country-selector">
            <CountrySelector
              setCountryCode={setCountryCode}
              data={dashboardData ?? undefined}
            />
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

      {analysis && (
        <>
          {/* PESTEL chart: separate section */}
          <div className="pestel-chart-section" role="region" aria-label="PESTEL factors chart">
            <div className="pestel-chart-section-toolbar">
              <button
                type="button"
                className="pestel-chart-download-btn"
                onClick={handleDownloadPestelChart}
                aria-label="Download PESTEL chart as high-resolution image"
                title="Download PESTEL chart as high-resolution PNG"
              >
                {/* Reuse the same download icon used in summary cards */}
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L7.25 8.44V2.25A.75.75 0 0 1 8 1.5Zm-4 9a.75.75 0 0 1 .75.75v1.25c0 .14.11.25.25.25h6a.25.25 0 0 0 .25-.25v-1.25a.75.75 0 0 1 1.5 0v1.25A1.75 1.75 0 0 1 11 14.5H5A1.75 1.75 0 0 1 3.25 12.75v-1.25A.75.75 0 0 1 4 10.5Z"
                  />
                </svg>
              </button>
            </div>
            <div ref={pestelChartRef} className="pestel-chart-capture-area">
              <PestelChart analysis={analysis} />
            </div>
          </div>

          {/* SWOT Analysis: 2x2 grid with summarized bullet points */}
          <div className="swot-chart-section" role="region" aria-label="SWOT Analysis">
            <div className="swot-chart-section-toolbar">
              <button
                type="button"
                className="pestel-chart-download-btn"
                onClick={handleDownloadSwotChart}
                aria-label="Download SWOT chart as high-resolution image"
                title="Download SWOT chart as high-resolution PNG"
              >
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L7.25 8.44V2.25A.75.75 0 0 1 8 1.5Zm-4 9a.75.75 0 0 1 .75.75v1.25c0 .14.11.25.25.25h6a.25.25 0 0 0 .25-.25v-1.25a.75.75 0 0 1 1.5 0v1.25A1.75 1.75 0 0 1 11 14.5H5A1.75 1.75 0 0 1 3.25 12.75v-1.25A.75.75 0 0 1 4 10.5Z"
                  />
                </svg>
              </button>
            </div>
            <div ref={swotChartRef} className="swot-chart-capture-area">
              <SwotChart analysis={analysis} />
            </div>
          </div>

          <div className="pestel-sections">
            {/* Comprehensive Analysis: full report (excluding extracted sections above), source */}
            <div className="pestel-output" role="article" aria-label="Comprehensive PESTEL analysis">
              <h3 className="pestel-output-title">Comprehensive Analysis</h3>

              <div className="pestel-content">
                {formatPestelContent(stripLeadingComprehensivePestelTitle(getReportWithoutRecommendations(getReportWithoutKeyTakeaways(getReportWithoutNewMarketAnalysis(getReportWithoutStrategicImplications(analysis))))))}
              </div>
              {source && (
                <div className="pestel-source muted">
                  {(() => {
                    const info = getAnswerSourceInfo(source);
                    if (!info) return null;
                    const name = getAnswerPersonaName(info.kind);
                    return (
                      <div className="analysis-source-header">
                        <div className={`chatbot-avatar-stack chatbot-avatar-${info.kind}`}>
                          {renderAnswerSourceIcon(info.kind)}
                          <span className="chatbot-avatar-name">{name}</span>
                        </div>
                        <span className="analysis-source-label">{info.label}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Strategic Implications: PESTEL–SWOT matrix narrative (own section) */}
            {strategicImplicationsBlock ? (
              <div className="pestel-output strategic-implications-section" role="region" aria-label="Strategic Implications for Business (PESTEL-SWOT)">
                <h3 className="pestel-output-title">Strategic Implications for Business (PESTEL-SWOT)</h3>
                <div className="pestel-content">
                  {formatPestelContent(stripLeadingH3(strategicImplicationsBlock))}
                </div>
              </div>
            ) : null}

            {/* New Market Analysis: own section */}
            {newMarketAnalysisBlock ? (
              <div className="pestel-output new-market-analysis-section" role="region" aria-label="New Market Analysis">
                <h3 className="pestel-output-title">New Market Analysis</h3>
                <div className="pestel-content">
                  {formatPestelContent(stripLeadingH3(newMarketAnalysisBlock))}
                </div>
              </div>
            ) : null}

            {/* Key Takeaways: own section */}
            {keyTakeawaysBlock ? (
              <div className="pestel-output key-takeaways-section" role="region" aria-label="Key Takeaways">
                <h3 className="pestel-output-title">Key Takeaways</h3>
                <div className="pestel-content">
                  {formatPestelContent(stripLeadingH3(keyTakeawaysBlock))}
                </div>
              </div>
            ) : null}

            {/* Recommendations: own section */}
            {recommendationsBlock ? (
              <div className="pestel-output recommendations-section" role="region" aria-label="Recommendations">
                <h3 className="pestel-output-title">Recommendations</h3>
                <div className="pestel-content">
                  {formatPestelContent(stripLeadingH3(recommendationsBlock))}
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
