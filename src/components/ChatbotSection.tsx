import { useCallback, useEffect, useRef, useState } from 'react';
import { buildChatSystemPrompt } from '../utils/chatContext';
import type { CountryDashboardData } from '../types';
import type { GlobalCountryRowForFallback } from '../utils/chatFallback';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';
import {
  LLM_MODELS,
  getModelsByTier,
  TIER_LABELS,
  getEffectiveApiKey,
  getStoredApiKey,
  setStoredApiKey,
  getStoredModel,
  setStoredModel,
  getProviderForModel,
  type PerformanceTier,
} from '../config/llm';
import { useToast } from './ToastProvider';
import { CountrySelector } from './CountrySelector';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
}

export type AnswerSourceKind =
  | 'dashboard'
  | 'groq'
  | 'tavily'
  | 'llm'
  | 'guidance'
  | 'other';

export interface AnswerSourceInfo {
  kind: AnswerSourceKind;
  label: string;
}

export function getAnswerPersonaName(kind: AnswerSourceKind): string {
  // Light tech-pop-culture inspired personas so users can quickly associate
  // each assistant answer with its underlying engine.
  switch (kind) {
    case 'dashboard':
      return 'Neo';
    case 'groq':
      return 'Trinity';
    case 'tavily':
      return 'Cortana';
    case 'llm':
      return 'Jarvis';
    case 'guidance':
      return 'Oracle';
    default:
      return 'Atlas';
  }
}

export function getAnswerSourceInfo(raw?: string): AnswerSourceInfo | null {
  if (!raw) return null;
  const value = raw.trim();
  const lower = value.toLowerCase();

  if (value === 'Dashboard data') {
    return { kind: 'dashboard', label: 'Dashboard data' };
  }

  if (value === 'Web search' || lower.includes('tavily')) {
    // Backend currently labels web-search answers as "Web search" (powered by Tavily).
    return { kind: 'tavily', label: 'Tavily web search' };
  }

  if (lower.includes('groq')) {
    // Model labels such as "Llama 3.1 8B (Groq)".
    return { kind: 'groq', label: value };
  }

  if (lower.includes('assistant guidance')) {
    return { kind: 'guidance', label: value };
  }

  // Any other non-empty label coming from getModelLabel(...) is treated as a generic LLM model.
  return { kind: 'llm', label: value };
}

export function renderAnswerSourceIcon(kind: AnswerSourceKind): JSX.Element {
  switch (kind) {
    case 'dashboard':
      // Bar chart / dashboard glyph
      return (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <path
            fill="currentColor"
            d="M2.75 2A.75.75 0 0 0 2 2.75v10.5c0 .414.336.75.75.75h10.5a.75.75 0 0 0 .75-.75V2.75A.75.75 0 0 0 13.25 2H2.75Zm.75 3.5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0v-5Zm3 2a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0v-3Zm3-3a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Z"
          />
        </svg>
      );
    case 'groq':
      // High-performance LLM chip / lightning icon
      return (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <path
            fill="currentColor"
            d="M8.5 1.25a.75.75 0 0 0-1.4.02L5.1 7H3a.75.75 0 0 0-.6 1.2l4 5.25a.75.75 0 0 0 1.35-.43V9h2.25a.75.75 0 0 0 .7-1.02L8.5 1.25Z"
          />
        </svg>
      );
    case 'tavily':
      // Web search / globe with magnifier
      return (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <path
            fill="currentColor"
            d="M7 1.5a5.5 5.5 0 1 1-3.89 9.39l-2.1 2.1a.75.75 0 1 1-1.06-1.06l2.1-2.1A5.5 5.5 0 0 1 7 1.5Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
          />
        </svg>
      );
    case 'llm':
      // Generic LLM / brain-like icon
      return (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <path
            fill="currentColor"
            d="M6 2a2.5 2.5 0 0 0-2.45 2H3.5A2.5 2.5 0 0 0 1 6.5c0 .9.47 1.69 1.17 2.13A2.75 2.75 0 0 0 4 12.75V13a2 2 0 0 0 2 2h.5a.75.75 0 0 0 .75-.75V3.5A1.5 1.5 0 0 0 6 2Zm4 0a2.5 2.5 0 0 1 2.45 2h.05A2.5 2.5 0 0 1 15 6.5c0 .9-.47 1.69-1.17 2.13A2.75 2.75 0 0 1 12 12.75V13a2 2 0 0 1-2 2h-.5a.75.75 0 0 1-.75-.75V3.5A1.5 1.5 0 0 1 10 2Z"
          />
        </svg>
      );
    case 'guidance':
      // Neutral info icon for assistant guidance
      return (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <path
            fill="currentColor"
            d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM8 5a.9.9 0 1 1 0-1.8A.9.9 0 0 1 8 5Zm1 5.75a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 1.5 0v3.25Z"
          />
        </svg>
      );
    default:
      // Fallback chat bubble
      return (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <path
            fill="currentColor"
            d="M2 3.75A1.75 1.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v5.5A1.75 1.75 0 0 1 12.25 11H6.5l-2.8 2.1A.75.75 0 0 1 2 12.53v-8.78Z"
          />
        </svg>
      );
  }
}

interface ChatbotSectionProps {
  dashboardData?: CountryDashboardData | null;
  /** Increment to force reload of global data (e.g. after "Refresh all data"). */
  refreshTrigger?: number;
  /** Optional setter to change the selected country from within the chat tab. */
  setCountryCode?: (code: string) => void;
}

const SUGGESTION_GROUPS: Array<{ title: string; items: string[] }> = [
  {
    title: 'Country overview',
    items: [
      'Give me an overview of the selected country',
      'Summary of key metrics',
      'Show all education metrics for the selected country in 2020',
      'Show all available metrics for Indonesia in 2024',
      'What are the key risks and opportunities for the selected country based on the dashboard data?',
    ],
  },
  {
    title: 'Comparisons & rankings',
    items: [
      'Compare Indonesia to Malaysia',
      'Compare GDP per capita and life expectancy between Indonesia, Malaysia, and Thailand in 2022',
      'Top 10 countries by GDP',
      'Top 5 Asian countries by poverty rate at $2.15/day',
      'Indonesia and Ukraine on 2024 in terms of Unemployment Rate',
      'Rank the G20 countries by GDP per capita and life expectancy',
      'Compare unemployment rate and labour force between Indonesia and Vietnam from 2015 to 2024',
    ],
  },
  {
    title: 'Time series',
    items: [
      'Show me the time series of GDP, inflation, and unemployment for the selected country from 2010 to 2024',
      'Show yearly GDP and population for Indonesia and Malaysia from 2000 to latest',
      'Show the trend of poverty rate and life expectancy for the selected country from 2000 to latest',
      'Show the time series of education expenditure (% of GDP) and literacy rate for the selected country',
    ],
  },
  {
    title: 'Definitions & methodology',
    items: [
      'What is the definition of government debt and how is it calculated?',
      'Explain the definition of unemployment rate and labour force using the data sources in this app',
      'Explain the definition of poverty at $2.15/day and national poverty line in this dashboard',
      'What education metrics are available in this app and what are their definitions?',
      'Explain the definition of GDP (nominal), GDP (PPP), and GDP per capita in this dashboard',
      'How are maternal mortality and under-5 mortality defined and measured in this app?',
    ],
  },
  {
    title: 'Geography & general knowledge',
    items: [
      'Where is Indonesia located and which countries border it?',
      'Which continent is Ukraine in?',
      'Who is the current president of Indonesia?',
      'What is the capital city, currency, and government type of the selected country?',
      'Which countries in Europe have the largest EEZ (Exclusive Economic Zone)?',
    ],
  },
  {
    title: 'Business & strategy',
    items: [
      'Generate a PESTEL analysis for Indonesia in the construction sector',
      'Generate a Porter Five Forces analysis for Vietnam in the food manufacturing sector',
      'Which countries look most attractive for expanding a food manufacturing business, based on GDP growth, population, and poverty data?',
      'Based on the dashboard data, which Asian countries look attractive for labour-intensive manufacturing?',
    ],
  },
];

type GlobalMetricsRow = Awaited<ReturnType<typeof fetchGlobalCountryMetricsForYear>>[number];

function mapGlobalRowsToFallback(
  rows: Awaited<ReturnType<typeof fetchGlobalCountryMetricsForYear>>,
): GlobalCountryRowForFallback[] {
  return rows.map((r: GlobalMetricsRow) => ({
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
    unemploymentRate: r.unemploymentRate,
    unemployedTotal: r.unemployedTotal,
    labourForceTotal: r.labourForceTotal,
    povertyHeadcount215: r.povertyHeadcount215,
    povertyHeadcountNational: r.povertyHeadcountNational,
    maternalMortalityRatio: r.maternalMortalityRatio,
    under5MortalityRate: r.under5MortalityRate,
    undernourishmentPrevalence: r.undernourishmentPrevalence,
    population0_14: r.population0_14,
    population15_64: r.population15_64,
    population65Plus: r.population65Plus,
    landAreaKm2: r.landAreaKm2,
    totalAreaKm2: r.totalAreaKm2,
    eezKm2: r.eezKm2,
    pop0_14Pct: r.pop0_14Pct,
    pop15_64Pct: r.pop15_64Pct,
    pop65PlusPct: r.pop65PlusPct,
    outOfSchoolPrimaryPct: r.outOfSchoolPrimaryPct,
    outOfSchoolSecondaryPct: r.outOfSchoolSecondaryPct,
    outOfSchoolTertiaryPct: r.outOfSchoolTertiaryPct,
    primaryCompletionRate: r.primaryCompletionRate,
    secondaryCompletionRate: r.secondaryCompletionRate,
    tertiaryCompletionRate: r.tertiaryCompletionRate,
    minProficiencyReadingPct: r.minProficiencyReadingPct,
    literacyRateAdultPct: r.literacyRateAdultPct,
    genderParityIndexPrimary: r.genderParityIndexPrimary,
    genderParityIndexSecondary: r.genderParityIndexSecondary,
    genderParityIndexTertiary: r.genderParityIndexTertiary,
    trainedTeachersPrimaryPct: r.trainedTeachersPrimaryPct,
    trainedTeachersSecondaryPct: r.trainedTeachersSecondaryPct,
    trainedTeachersTertiaryPct: r.trainedTeachersTertiaryPct,
    publicExpenditureEducationPctGDP: r.publicExpenditureEducationPctGDP,
    primaryPupilsTotal: r.primaryPupilsTotal,
    secondaryPupilsTotal: r.secondaryPupilsTotal,
    tertiaryEnrollmentTotal: r.tertiaryEnrollmentTotal,
    primarySchoolCount: r.primarySchoolCount,
    secondarySchoolCount: r.secondarySchoolCount,
    tertiaryInstitutionCount: r.tertiaryInstitutionCount,
    region: r.region,
    headOfGovernmentType: r.headOfGovernmentType,
    governmentType: r.governmentType,
  }));
}

export function ChatbotSection({
  dashboardData,
  refreshTrigger = 0,
  setCountryCode,
}: ChatbotSectionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState(getStoredModel);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [openSuggestionGroups, setOpenSuggestionGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(SUGGESTION_GROUPS.map((g) => [g.title, false])) as Record<
      string,
      boolean
    >,
  );
  const [globalData, setGlobalData] = useState<GlobalCountryRowForFallback[]>([]);
  const [globalDataByYear, setGlobalDataByYear] = useState<
    Record<number, GlobalCountryRowForFallback[]>
  >({});
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null as unknown as SpeechRecognition | null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { showToast, updateToast, dismissToast } = useToast();

  const year =
    dashboardData?.latestSnapshot?.year ??
    dashboardData?.range?.endYear ??
    DATA_MAX_YEAR;

  useEffect(() => {
    setStoredModel(model);
  }, [model]);

  useEffect(() => {
    if (showSettings) {
      setApiKeyInput(getStoredApiKey(getProviderForModel(model) ?? 'openai') ?? '');
    }
  }, [showSettings, model]);

  const resetSuggestionGroups = useCallback(() => {
    setOpenSuggestionGroups(
      Object.fromEntries(SUGGESTION_GROUPS.map((g) => [g.title, false])) as Record<
        string,
        boolean
      >,
    );
  }, []);

  const handleToggleSuggestions = () => {
    setShowSuggestions((prev) => {
      const next = !prev;
      if (next) {
        resetSuggestionGroups();
      }
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const preferredYear = dashboardData?.latestSnapshot?.year ?? DATA_MAX_YEAR;
    const yearsToLoad = Array.from(
      { length: DATA_MAX_YEAR - DATA_MIN_YEAR + 1 },
      (_, i) => DATA_MIN_YEAR + i,
    );

    async function loadFirstYear() {
      try {
        const rows = await fetchGlobalCountryMetricsForYear(preferredYear);
        if (!cancelled) {
          const mapped = mapGlobalRowsToFallback(rows);
          setGlobalData(mapped);
          setGlobalDataByYear((prev) => ({ ...prev, [preferredYear]: mapped }));
        }
      } catch {
        if (!cancelled) {
          setGlobalData([]);
          setGlobalDataByYear({});
        }
      }
    }

    async function loadRemainingYears() {
      const rest = yearsToLoad.filter((y) => y !== preferredYear);
      if (rest.length === 0) return;
      try {
        const rowsByYear = await Promise.all(
          rest.map((y) => fetchGlobalCountryMetricsForYear(y)),
        );
        if (!cancelled) {
          setGlobalDataByYear((prev) => {
            const next = { ...prev };
            rest.forEach((y, i) => {
              next[y] = mapGlobalRowsToFallback(rowsByYear[i]);
            });
            return next;
          });
          setGlobalData((prev) => {
            if (prev.length > 0) return prev;
            return mapGlobalRowsToFallback(rowsByYear[rowsByYear.length - 1] ?? []);
          });
        }
      } catch {
        if (!cancelled) {
          setGlobalDataByYear((prev) => (Object.keys(prev).length > 0 ? prev : {}));
        }
      }
    }

    void loadFirstYear().then(() => {
      if (!cancelled) void loadRemainingYears();
    });
    return () => {
      cancelled = true;
    };
  }, [year, refreshTrigger]);

  const currentProvider = getProviderForModel(model) ?? 'openai';
  const providerLabels: Record<string, string> = {
    openai: 'OpenAI',
    groq: 'Groq',
    anthropic: 'Anthropic',
    google: 'Google AI',
    openrouter: 'OpenRouter',
    tavily: 'Tavily',
  };

  const handleSaveApiKey = () => {
    setStoredApiKey(currentProvider, apiKeyInput || undefined);
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
      const start = performance.now();
      const loadingToastId = showToast({
        type: 'loading',
        message: 'Generating answer… (0%)',
      });

      const isGroq = (getProviderForModel(model) ?? '') === 'groq';
      const recentMessages = isGroq ? messages.slice(-4) : messages;
      const allMessages: Array<{ role: string; content: string }> = [
        ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: trimmed },
      ];

      try {
        const apiKey = getEffectiveApiKey(model);
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

        const wantsYearlyTimeSeries =
          /yearly|annually|year\s*by\s*year|year\s*basis|annually\s*basis|from\s*20[0-2][0-9]|since\s*20[0-2][0-9]|between\s*20[0-2][0-9]\s+(?:and|-|to)\s*(?:20[0-2][0-9]|latest|now|current|the latest)|to\s*latest|each\s*year|monthly|quarterly|weekly/i.test(
            trimmed,
          );

        let effectiveGlobalDataByYear = globalDataByYear;

        if (wantsYearlyTimeSeries) {
          const yearRange = parseRequestedYearRangeClient(trimmed);
          if (yearRange) {
            const missingYears: number[] = [];
            for (let y = yearRange.fromYear; y <= yearRange.toYear; y += 1) {
              if (y < DATA_MIN_YEAR || y > DATA_MAX_YEAR) continue;
              if (!effectiveGlobalDataByYear[y]) {
                missingYears.push(y);
              }
            }
            if (missingYears.length > 0) {
              try {
                const rowsByYear = await Promise.all(
                  missingYears.map((y) => fetchGlobalCountryMetricsForYear(y)),
                );
                const newEntries: Record<number, GlobalCountryRowForFallback[]> = {};
                missingYears.forEach((yearValue, idx) => {
                  newEntries[yearValue] = mapGlobalRowsToFallback(rowsByYear[idx]);
                });
                effectiveGlobalDataByYear = {
                  ...effectiveGlobalDataByYear,
                  ...newEntries,
                };
                setGlobalDataByYear((prev) => ({ ...prev, ...newEntries }));
              } catch {
                // Ignore fetch errors here – we'll fall back to whatever data is already loaded.
              }
            }
          }
        }
        // Use enough rows for rule-based fallback rankings (top N by metric). Groq prompt stays compact via buildChatSystemPrompt options.
        const globalLimit = wantsYearlyTimeSeries ? 250 : 999;
        const globalDataPayload =
          globalData.length > 0
            ? globalData.slice(0, globalLimit).map((r) => ({
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
                unemploymentRate: r.unemploymentRate,
                unemployedTotal: r.unemployedTotal,
                labourForceTotal: r.labourForceTotal,
                maternalMortalityRatio: r.maternalMortalityRatio,
                under5MortalityRate: r.under5MortalityRate,
                undernourishmentPrevalence: r.undernourishmentPrevalence,
                population0_14: r.population0_14,
                population15_64: r.population15_64,
                population65Plus: r.population65Plus,
                landAreaKm2: r.landAreaKm2,
                totalAreaKm2: r.totalAreaKm2,
                eezKm2: r.eezKm2,
                pop0_14Pct: r.pop0_14Pct,
                pop15_64Pct: r.pop15_64Pct,
                pop65PlusPct: r.pop65PlusPct,
                // Education – enrollment, quality, and institution counts
                outOfSchoolPrimaryPct: r.outOfSchoolPrimaryPct,
                outOfSchoolSecondaryPct: r.outOfSchoolSecondaryPct,
                outOfSchoolTertiaryPct: r.outOfSchoolTertiaryPct,
                primaryCompletionRate: r.primaryCompletionRate,
                secondaryCompletionRate: r.secondaryCompletionRate,
                tertiaryCompletionRate: r.tertiaryCompletionRate,
                minProficiencyReadingPct: r.minProficiencyReadingPct,
                literacyRateAdultPct: r.literacyRateAdultPct,
                genderParityIndexPrimary: r.genderParityIndexPrimary,
                genderParityIndexSecondary: r.genderParityIndexSecondary,
                genderParityIndexTertiary: r.genderParityIndexTertiary,
                trainedTeachersPrimaryPct: r.trainedTeachersPrimaryPct,
                trainedTeachersSecondaryPct: r.trainedTeachersSecondaryPct,
                trainedTeachersTertiaryPct: r.trainedTeachersTertiaryPct,
                publicExpenditureEducationPctGDP: r.publicExpenditureEducationPctGDP,
                primaryPupilsTotal: r.primaryPupilsTotal,
                secondaryPupilsTotal: r.secondaryPupilsTotal,
                tertiaryEnrollmentTotal: r.tertiaryEnrollmentTotal,
                primarySchoolCount: r.primarySchoolCount,
                secondarySchoolCount: r.secondarySchoolCount,
                tertiaryInstitutionCount: r.tertiaryInstitutionCount,
                region: r.region,
                headOfGovernmentType: r.headOfGovernmentType,
                governmentType: r.governmentType,
              }))
            : null;

        const yearMatch = trimmed.match(/\b(20[0-2][0-9])\b/);
        const requestedYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
        const hasRequestedYear = requestedYear && effectiveGlobalDataByYear[requestedYear];
        const allYears = Object.keys(effectiveGlobalDataByYear)
          .map(Number)
          .filter((y) => !Number.isNaN(y));
        const latestYearInData = allYears.length > 0 ? Math.max(...allYears) : year;
        const globalDataByYearEntries = wantsYearlyTimeSeries
          ? Object.entries(effectiveGlobalDataByYear)
          : isGroq
            ? hasRequestedYear
              ? [
                  [String(requestedYear), effectiveGlobalDataByYear[requestedYear]],
                  ...Object.entries(effectiveGlobalDataByYear).filter(
                    ([y]) => Number(y) !== requestedYear,
                  ),
                ]
              : latestYearInData in effectiveGlobalDataByYear
                ? [[String(latestYearInData), effectiveGlobalDataByYear[latestYearInData]]]
                : Object.entries(effectiveGlobalDataByYear).slice(0, 1)
            : Object.entries(effectiveGlobalDataByYear);
        const yearEntryLimit = wantsYearlyTimeSeries ? 999 : isGroq ? 1 : 999;
        const requestedCountryNames = wantsYearlyTimeSeries
          ? (trimmed.match(/\b(United Kingdom|United States|South Korea|South Africa|Indonesia|Ukraine|Malaysia|Singapore|Thailand|Vietnam|Philippines|Japan|China|India|Brazil|Mexico|Germany|France|Russia|Australia|Canada)\b/gi) ?? [])
              .filter((n, i, arr) => arr.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i)
          : [];
        const pickRows = (rows: GlobalCountryRowForFallback[]) => {
          if (requestedCountryNames.length === 0) return rows.slice(0, globalLimit);
          const requested = requestedCountryNames.flatMap((name) =>
            rows.filter((r) => (r.name ?? '').toLowerCase() === name.toLowerCase()),
          );
          const rest = rows.filter((r) => !requestedCountryNames.some((n) => (r.name ?? '').toLowerCase() === n.toLowerCase()));
          return [...requested, ...rest].slice(0, globalLimit);
        };
        const globalDataByYearPayload =
          Object.keys(effectiveGlobalDataByYear).length > 0
            ? Object.fromEntries(
                globalDataByYearEntries.slice(0, yearEntryLimit).map(([y, rows]) => [
                  y,
                  pickRows(Array.isArray(rows) ? rows : []).map((r) => ({
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
                    unemploymentRate: r.unemploymentRate,
                    unemployedTotal: r.unemployedTotal,
                    labourForceTotal: r.labourForceTotal,
                    povertyHeadcount215: r.povertyHeadcount215,
                    povertyHeadcountNational: r.povertyHeadcountNational,
                    maternalMortalityRatio: r.maternalMortalityRatio,
                    under5MortalityRate: r.under5MortalityRate,
                    undernourishmentPrevalence: r.undernourishmentPrevalence,
                    population0_14: r.population0_14,
                    population15_64: r.population15_64,
                    population65Plus: r.population65Plus,
                    landAreaKm2: r.landAreaKm2,
                    totalAreaKm2: r.totalAreaKm2,
                    eezKm2: r.eezKm2,
                    pop0_14Pct: r.pop0_14Pct,
                    pop15_64Pct: r.pop15_64Pct,
                    pop65PlusPct: r.pop65PlusPct,
                    // Education – enrollment, quality, and institution counts
                    outOfSchoolPrimaryPct: r.outOfSchoolPrimaryPct,
                    outOfSchoolSecondaryPct: r.outOfSchoolSecondaryPct,
                    outOfSchoolTertiaryPct: r.outOfSchoolTertiaryPct,
                    primaryCompletionRate: r.primaryCompletionRate,
                    secondaryCompletionRate: r.secondaryCompletionRate,
                    tertiaryCompletionRate: r.tertiaryCompletionRate,
                    minProficiencyReadingPct: r.minProficiencyReadingPct,
                    literacyRateAdultPct: r.literacyRateAdultPct,
                    genderParityIndexPrimary: r.genderParityIndexPrimary,
                    genderParityIndexSecondary: r.genderParityIndexSecondary,
                    genderParityIndexTertiary: r.genderParityIndexTertiary,
                    trainedTeachersPrimaryPct: r.trainedTeachersPrimaryPct,
                    trainedTeachersSecondaryPct: r.trainedTeachersSecondaryPct,
                    trainedTeachersTertiaryPct: r.trainedTeachersTertiaryPct,
                    publicExpenditureEducationPctGDP: r.publicExpenditureEducationPctGDP,
                    primaryPupilsTotal: r.primaryPupilsTotal,
                    secondaryPupilsTotal: r.secondaryPupilsTotal,
                    tertiaryEnrollmentTotal: r.tertiaryEnrollmentTotal,
                    primarySchoolCount: r.primarySchoolCount,
                    secondarySchoolCount: r.secondarySchoolCount,
                    tertiaryInstitutionCount: r.tertiaryInstitutionCount,
                    region: r.region,
                    headOfGovernmentType: r.headOfGovernmentType,
                    governmentType: r.governmentType,
                  })),
                ]),
              )
            : null;

        let res: Response;
        try {
          res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: allMessages,
              systemPrompt: buildChatSystemPrompt(
                dashboardData,
                globalData,
                globalDataByYear,
                { compact: isGroq, userQuery: trimmed, effectiveYear: year },
              ),
              model,
              dashboardSnapshot,
              globalData: globalDataPayload,
              globalDataByYear: globalDataByYearPayload,
              ...(apiKey && { apiKey }),
            }),
          });
        } catch (netErr) {
          throw new Error(
            'Network error. Ensure you run with `npm run dev` (not a static build). Add required keys to .env for LLM and web search. See README.',
          );
        }

        let data: { content?: string; error?: string; source?: string };
        try {
          data = await res.json();
        } catch {
          throw new Error(
            res.status === 404
              ? 'Chat API not found. Run `npm run dev` or `npm run preview`. Add required keys to .env and restart.'
              : `Invalid response (${res.status})`,
          );
        }

        if (!res.ok) {
          const msg = data?.error ?? `Request failed (${res.status})`;
          throw new Error(
            res.status === 404
              ? 'Chat API not found. Run `npm run dev` or `npm run preview`. Add required keys to .env and restart.'
              : msg,
          );
        }

        // Guardrail: if the backend accidentally answers a pure location/geography question
        // with dashboard metrics (Key metrics / Full overview), override it with guidance
        // so we never show misleading metric cards for "Where is X located?" type queries.
        let content = data.content ?? 'No response.';
        let source = data.source;
        const userText = trimmed;
        const looksLikeLocation = isLocationQuestionClient(userText);
        const looksLikeMetricsCard =
          source === 'Dashboard data' &&
          /\*\*[^*]+ – (?:Key metrics|Full overview)\s*\(/.test(content);
        const hasMetricKeyword = /\b(gdp|population|inflation|debt|unemployment|life expectancy|poverty|per capita|growth|rate|metric|data)\b/i.test(
          userText,
        );
        if (
          source === 'Dashboard data' &&
          (looksLikeLocation || (looksLikeMetricsCard && !hasMetricKeyword))
        ) {
          content = LOCATION_UI_FALLBACK_MESSAGE;
          source = 'Assistant guidance';
        }

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content,
          source,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        // After each answered question, fully collapse suggestive questions:
        // hide the toolbar and reset all groups to collapsed.
        setShowSuggestions(false);
        resetSuggestionGroups();
        const seconds = Math.max((performance.now() - start) / 1000, 0.1).toFixed(1);
        updateToast(loadingToastId, {
          type: 'success',
          message: `Answer generated (100%, ${seconds}s).`,
          durationMs: 4000,
        });
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
        const seconds = Math.max((performance.now() - start) / 1000, 0.1).toFixed(1);
        updateToast(loadingToastId, {
          type: 'error',
          message: `Failed to generate answer (0%, ${seconds}s).`,
          durationMs: 6000,
        });
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
      updateToast,
      showToast,
      dismissToast,
    ],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const ensureSpeechRecognition = (): SpeechRecognition | null => {
    if (typeof window === 'undefined') return null;
    const AnyWindow = window as typeof window & {
      webkitSpeechRecognition?: typeof SpeechRecognition;
    };
    const RecognitionCtor =
      (AnyWindow as any).SpeechRecognition || AnyWindow.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      showToast({
        type: 'error',
        message: 'Voice input is not supported in this browser.',
        durationMs: 4000,
      });
      return null;
    }
    if (!recognitionRef.current) {
      recognitionRef.current = new RecognitionCtor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
    }
    return recognitionRef.current;
  };

  const handleToggleVoiceInput = () => {
    const recognition = ensureSpeechRecognition();
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }
    try {
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0]?.transcript ?? '')
          .join(' ')
          .trim();
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = () => {
        setIsListening(false);
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      showToast({
        type: 'error',
        message: 'Could not start voice input. Please try again.',
        durationMs: 4000,
      });
    }
  };

  const normalizeForSpeech = (text: string): string => {
    let plain = text.replace(/```[\s\S]*?```/g, ' ');
    plain = plain.replace(/`([^`]+)`/g, '$1');
    plain = plain.replace(/\*\*([^*]+)\*\*/g, '$1');
    plain = plain.replace(/\*([^*]+)\*/g, '$1');
    plain = plain.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    plain = plain.replace(/#{1,6}\s*/g, '');
    plain = plain.replace(/[_~]/g, '');
    return plain;
  };

  const handleToggleSpeakMessage = (message: Message) => {
    if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') {
      showToast({
        type: 'error',
        message: 'Voice playback is not supported in this browser.',
        durationMs: 4000,
      });
      return;
    }
    const synth = window.speechSynthesis;
    if (speakingMessageId === message.id) {
      synth.cancel();
      setSpeakingMessageId(null);
      speechUtteranceRef.current = null;
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(normalizeForSpeech(message.content));
    speechUtteranceRef.current = utterance;
    setSpeakingMessageId(message.id);
    utterance.onend = () => {
      setSpeakingMessageId(null);
      speechUtteranceRef.current = null;
    };
    utterance.onerror = () => {
      setSpeakingMessageId(null);
      speechUtteranceRef.current = null;
    };
    synth.speak(utterance);
  };

  const handleToggleSuggestionGroup = (title: string) => {
    setOpenSuggestionGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <section className="card chatbot-section">
      <div className="section-header chatbot-header">
        <div>
          <h2 className="section-title">Analytics assistant</h2>
          <p className="muted">
            Country Analytics Platform offers a modern, analyst-grade view across financial, demographic, health, and education metrics for every country (2000 – latest), powered by World Bank WDI, IMF WEO, UNESCO UIS, and UN/WHO data. Government debt (% of GDP) is filled from IMF when World Bank has no data (e.g. China). Ask the assistant about metrics, rankings, methodology, data sources, or general knowledge (e.g. where a country is located). Global Analytics includes a region filter for map, table, and charts. Powered by LLM with access to dashboard data and web search.
          </p>
        </div>
        <div className="chatbot-controls">
          {setCountryCode && (
            <div className="chatbot-country-select-wrap">
              <CountrySelector setCountryCode={setCountryCode} data={dashboardData ?? undefined} />
            </div>
          )}
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
              {(['tier1', 'tier2', 'tier3'] as PerformanceTier[]).map((tier) => {
                const models = getModelsByTier()[tier];
                if (models.length === 0) return null;
                return (
                  <optgroup key={tier} label={TIER_LABELS[tier]}>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
          <button
            type="button"
            className="chatbot-settings-btn"
            onClick={() => setShowSettings(!showSettings)}
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
              {providerLabels[currentProvider]} API key (for {LLM_MODELS.find((m) => m.id === model)?.label ?? 'selected model'})
            </label>
            <input
              id="chatbot-apikey"
              type="password"
              className="chatbot-settings-input"
              placeholder={
                currentProvider === 'openai'
                  ? 'sk-...'
                  : currentProvider === 'anthropic'
                    ? 'sk-ant-...'
                    : 'Paste your API key'
              }
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              aria-label={`${providerLabels[currentProvider]} API key`}
            />
          </div>
          <p className="chatbot-settings-hint muted">
            {currentProvider === 'tavily'
              ? 'Tavily uses server key. Add to .env (see .env.example). No client key needed.'
              : 'Keys are stored locally per provider. For server-side keys, add the required variables to .env (see .env.example). Never commit real keys.'}
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
                Ask about dashboard data, metrics, and sources — or general knowledge such as a country&apos;s location.
              </p>
              <p className="chatbot-welcome-hint muted">
                Use the toolbar below (grouped by use case) or type your own question:
              </p>
              <div className="chatbot-suggestions-toggle-row">
                <button
                  type="button"
                  className="chatbot-suggestions-toggle"
                  onClick={handleToggleSuggestions}
                  aria-expanded={showSuggestions}
                  aria-controls="chatbot-suggestions-toolbar"
                >
                  <span className="chatbot-suggestions-toggle-label">
                    {showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
                  </span>
                  <span className="chatbot-suggestions-toggle-icon" aria-hidden>
                    <svg viewBox="0 0 20 20" width="16" height="16">
                      <path
                        fill="currentColor"
                        d={
                          showSuggestions
                            ? 'M5.23 12.21a.75.75 0 0 1 1.06.02L10 15.06l3.71-2.83a.75.75 0 1 1 .9 1.2l-4.16 3.18a.75.75 0 0 1-.9 0l-4.16-3.18a.75.75 0 0 1 .02-1.22Z'
                            : 'M5.23 7.79a.75.75 0 0 1 1.06-.02L10 10.94l3.71-3.17a.75.75 0 1 1 .9 1.2l-4.16 3.18a.75.75 0 0 1-.9 0L5.25 8.97a.75.75 0 0 1-.02-1.18Z'
                        }
                      />
                    </svg>
                  </span>
                </button>
              </div>
              {showSuggestions && (
                <div
                  className="chatbot-suggestions-toolbar"
                  id="chatbot-suggestions-toolbar"
                >
                  {SUGGESTION_GROUPS.map((group) => {
                    const isOpen = openSuggestionGroups[group.title] ?? false;
                    return (
                      <div key={group.title} className="chatbot-suggestions-group">
                        <button
                          type="button"
                          className="chatbot-suggestions-group-toggle"
                          onClick={() => handleToggleSuggestionGroup(group.title)}
                          aria-expanded={isOpen}
                        >
                          <span className="chatbot-suggestions-group-title">
                            {group.title}
                          </span>
                          <span
                            className="chatbot-suggestions-group-chevron"
                            aria-hidden
                            data-open={isOpen ? 'true' : 'false'}
                          >
                            <svg viewBox="0 0 20 20" width="14" height="14">
                              <path
                                fill="currentColor"
                                d="M5.23 7.79a.75.75 0 0 1 1.06-.02L10 10.94l3.71-3.17a.75.75 0 1 1 .9 1.2l-4.16 3.18a.75.75 0 0 1-.9 0L5.25 8.97a.75.75 0 0 1-.02-1.18Z"
                              />
                            </svg>
                          </span>
                        </button>
                        {isOpen && (
                          <div className="chatbot-suggestions">
                            {group.items.map((s) => (
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="chatbot-message-list">
              {messages.map((m, index) => {
                const isRankingFallback =
                  m.role === 'assistant' &&
                  m.source === 'Dashboard data' &&
                  (m.content.includes('try your question again') || m.content.includes('Ranking data'));
                const lastUserMessageBefore = isRankingFallback
                  ? [...messages.slice(0, index)].reverse().find((msg) => msg.role === 'user')?.content
                  : undefined;
                return (
                <div
                  key={m.id}
                  className={`chatbot-message chatbot-message-${m.role}${m.content.includes("couldn't process") ? ' chatbot-message-error' : ''}`}
                >
                  <div className="chatbot-message-avatar" aria-hidden>
                    {m.role === 'user' ? (
                      <div className="chatbot-avatar-stack" title="You">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                          <path
                            fill="currentColor"
                            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                          />
                        </svg>
                        <span className="chatbot-avatar-name">You</span>
                      </div>
                    ) : (
                      (() => {
                        const info = getAnswerSourceInfo(m.source);
                        const kind: AnswerSourceKind = info?.kind ?? 'other';
                        const name = getAnswerPersonaName(kind);
                        const title =
                          info?.label && info.label !== name
                            ? `${name} – ${info.label}`
                            : name;
                        return (
                          <div
                            className={`chatbot-avatar-stack chatbot-avatar-${kind}`}
                            title={title}
                          >
                            {renderAnswerSourceIcon(kind)}
                            <span className="chatbot-avatar-name">{name}</span>
                          </div>
                        );
                      })()
                    )}
                  </div>
                  <div className="chatbot-message-content" role={m.role === 'user' ? undefined : 'article'}>
                    {m.role === 'assistant' ? (
                      <>
                        <div
                          className="chatbot-message-markdown chat-prose"
                          dangerouslySetInnerHTML={{
                            __html: formatMessage(m.content),
                          }}
                        />
                        <div className="chatbot-message-audio-controls">
                          <button
                            type="button"
                            className="chatbot-voice-output-btn"
                            onClick={() => handleToggleSpeakMessage(m)}
                            disabled={isLoading}
                            aria-label={
                              speakingMessageId === m.id
                                ? 'Stop voice playback'
                                : 'Play answer with voice'
                            }
                            title={
                              speakingMessageId === m.id
                                ? 'Stop voice playback'
                                : 'Play answer with voice'
                            }
                          >
                            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                              <path
                                fill="currentColor"
                                d={
                                  speakingMessageId === m.id
                                    ? 'M6 5h4v14H6V5zm8 0h4v14h-4V5z'
                                    : 'M3 10v4h4l5 5V5L7 10H3zm13.5 2a3.5 3.5 0 0 0-2.45-3.34v2.14a1.5 1.5 0 1 1 0 2.4v2.14A3.5 3.5 0 0 0 16.5 12zm-2.45-6.9v2.1A6 6 0 0 1 19 12a6 6 0 0 1-4.95 5.9v-2.1A4 4 0 0 0 17 12a4 4 0 0 0-2.95-3.9z'
                                }
                              />
                            </svg>
                          </button>
                        </div>
                        {(() => {
                          const info = getAnswerSourceInfo(m.source);
                          if (!info) return null;
                          return (
                            <div
                              className={`chatbot-message-source chatbot-message-source-${info.kind}`}
                              aria-label={`Answer source: ${info.label}`}
                            >
                              <span className="chatbot-message-source-icon" aria-hidden>
                                {renderAnswerSourceIcon(info.kind)}
                              </span>
                              <span className="chatbot-message-source-label">
                                {info.label}
                              </span>
                            </div>
                          );
                        })()}
                        {lastUserMessageBefore && (
                          <div className="chatbot-try-again-wrap">
                            <button
                              type="button"
                              className="chatbot-try-again-btn"
                              onClick={() => sendMessage(lastUserMessageBefore)}
                              disabled={isLoading}
                              aria-label="Try again with same question"
                            >
                              Try again
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="chatbot-message-user-text">{m.content}</p>
                    )}
                  </div>
                </div>
                );
              })}
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
              <div className="chatbot-suggestions-inline">
                <p className="chatbot-suggestions-inline-label muted">
                  Quick suggestive questions (grouped by use case):
                </p>
                <div className="chatbot-suggestions-toggle-row">
                  <button
                    type="button"
                    className="chatbot-suggestions-toggle"
                    onClick={handleToggleSuggestions}
                    aria-expanded={showSuggestions}
                    aria-controls="chatbot-suggestions-toolbar"
                  >
                    <span className="chatbot-suggestions-toggle-label">
                      {showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
                    </span>
                    <span className="chatbot-suggestions-toggle-icon" aria-hidden>
                      <svg viewBox="0 0 20 20" width="16" height="16">
                        <path
                          fill="currentColor"
                          d={
                            showSuggestions
                              ? 'M5.23 12.21a.75.75 0 0 1 1.06.02L10 15.06l3.71-2.83a.75.75 0 1 1 .9 1.2l-4.16 3.18a.75.75 0 0 1-.9 0l-4.16-3.18a.75.75 0 0 1 .02-1.22Z'
                              : 'M5.23 7.79a.75.75 0 0 1 1.06-.02L10 10.94l3.71-3.17a.75.75 0 1 1 .9 1.2l-4.16 3.18a.75.75 0 0 1-.9 0L5.25 8.97a.75.75 0 0 1-.02-1.18Z'
                          }
                        />
                      </svg>
                    </span>
                  </button>
                </div>
                {showSuggestions && (
                  <div
                    className="chatbot-suggestions-toolbar"
                    id="chatbot-suggestions-toolbar"
                  >
                    {SUGGESTION_GROUPS.map((group) => {
                      const isOpen = openSuggestionGroups[group.title] ?? false;
                      return (
                        <div key={group.title} className="chatbot-suggestions-group">
                          <button
                            type="button"
                            className="chatbot-suggestions-group-toggle"
                            onClick={() => handleToggleSuggestionGroup(group.title)}
                            aria-expanded={isOpen}
                          >
                            <span className="chatbot-suggestions-group-title">
                              {group.title}
                            </span>
                            <span
                              className="chatbot-suggestions-group-chevron"
                              aria-hidden
                              data-open={isOpen ? 'true' : 'false'}
                            >
                              <svg viewBox="0 0 20 20" width="14" height="14">
                                <path
                                  fill="currentColor"
                                  d="M5.23 7.79a.75.75 0 0 1 1.06-.02L10 10.94l3.71-3.17a.75.75 0 1 1 .9 1.2l-4.16 3.18a.75.75 0 0 1-.9 0L5.25 8.97a.75.75 0 0 1-.02-1.18Z"
                                />
                              </svg>
                            </span>
                          </button>
                          {isOpen && (
                            <div className="chatbot-suggestions">
                              {group.items.map((s) => (
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
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chatbot-input-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="chatbot-input"
            placeholder="Ask about metrics, sources, methodology, or location…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            aria-label="Chat message"
          />
          <div className="chatbot-input-actions">
            <button
              type="button"
              className={`chatbot-send chatbot-voice-input-btn${isListening ? ' chatbot-voice-input-btn-active' : ''}`}
              onClick={handleToggleVoiceInput}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              title={isListening ? 'Stop voice input' : 'Start voice input'}
              disabled={isLoading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <path
                  fill="currentColor"
                  d={
                    isListening
                      ? 'M6 5h3v14H6V5zm9 0h3v14h-3V5z'
                      : 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zm-7 9a1 1 0 0 1 2 0 5 5 0 0 0 10 0 1 1 0 0 1 2 0 7 7 0 0 1-6 6.93V21h-2v-3.07A7 7 0 0 1 5 11z'
                  }
                />
              </svg>
            </button>
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
          </div>
        </form>

        {error && (
          <p className="chatbot-error muted">
            {error.includes('API') && error.toLowerCase().includes('key')
              ? `Add an API key for ${providerLabels[currentProvider]} in Settings, or set the corresponding env var.`
              : error}
          </p>
        )}
      </div>
    </section>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function parseRequestedYearRangeClient(
  q: string,
): { fromYear: number; toYear: number } | null {
  const fromToExplicit = q.match(/from\s+(20[0-2][0-9])\s+(?:to|until|through|till)\s+(20[0-2][0-9])/i);
  if (fromToExplicit) {
    const fromYear = parseInt(fromToExplicit[1], 10);
    const toYear = parseInt(fromToExplicit[2], 10);
    return { fromYear, toYear };
  }

  const fromToLatest = q.match(
    /from\s+(20[0-2][0-9])\s+(?:to|until|through|till)\s+(?:latest|now|current|present|the latest)/i,
  );
  if (fromToLatest) {
    const fromYear = parseInt(fromToLatest[1], 10);
    return { fromYear, toYear: DATA_MAX_YEAR };
  }

  const betweenExplicit = q.match(
    /between\s+(20[0-2][0-9])\s+(?:and|-|to)\s+(20[0-2][0-9])/i,
  );
  if (betweenExplicit) {
    const fromYear = parseInt(betweenExplicit[1], 10);
    const toYear = parseInt(betweenExplicit[2], 10);
    return { fromYear, toYear };
  }

  const betweenLatest = q.match(
    /between\s+(20[0-2][0-9])\s+(?:and|-|to)\s+(?:latest|now|current|present|the latest)/i,
  );
  if (betweenLatest) {
    const fromYear = parseInt(betweenLatest[1], 10);
    return { fromYear, toYear: DATA_MAX_YEAR };
  }

  const sinceMatch = q.match(
    /(?:since|from)\s+(20[0-2][0-9])\b(?:\s+(?:onwards|forward|until\s+now|until\s+current|until\s+latest))?/i,
  );
  if (sinceMatch) {
    const fromYear = parseInt(sinceMatch[1], 10);
    return { fromYear, toYear: DATA_MAX_YEAR };
  }

  const fromOnly = q.match(/from\s+(20[0-2][0-9])/i);
  if (fromOnly) {
    const fromYear = parseInt(fromOnly[1], 10);
    return { fromYear, toYear: DATA_MAX_YEAR };
  }

  return null;
}

/** Rich markdown-like formatting for assistant messages – distinguishable structure */
function formatMessage(text: string): string {
  // Convert HTML links to markdown before escaping (API may return HTML from web search)
  let normalized = text.replace(/<a\s+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, '[$2]($1)');
  const escaped = normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const withLinks = escaped.replace(
    /\[([^\]]*)\]\s*\((https?:\/\/[^)\s]+)\)/g,
    (_, linkText, url) => {
      const safeUrl = escapeAttr(url);
      const safeText = escapeHtml(linkText);
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="chat-link">${safeText}</a>`;
    },
  );
  const withInline = withLinks
    .replace(/\*\*(.+?)\*\*/g, '<strong class="chat-strong">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="chat-em">$1</em>')
    .replace(/`(.+?)`/g, '<code class="chat-code">$1</code>')
    .replace(/_([^_]+)_/g, '<span class="chat-muted">$1</span>');
  // Treat lines like "1. Population, total (2024):" as labeled headings instead of
  // starting a new ordered list for each single item. This avoids repeated "1."
  // numbering when the LLM structures sections that way.
  const normalizedNumberedHeadings = withInline
    .split('\n')
    .map((line) => {
      const m = line.match(/^(\d+)\.\s+(.+?):\s*$/);
      if (m) {
        return `<strong class="chat-strong">${m[2]}:</strong>`;
      }
      return line;
    })
    .join('\n');

  const lines = normalizedNumberedHeadings.split('\n');
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

const LOCATION_UI_FALLBACK_MESSAGE =
  'I can help with **all metrics in this dashboard**: GDP (nominal, PPP, per capita), inflation, government debt (from World Bank or IMF when WB has no data), interest rate, unemployment (rate and number), labour force, poverty ($2.15/day and national line), population (total and age groups 0–14, 15–64, 65+), life expectancy, maternal mortality, under-5 mortality, undernourishment, land/total area, EEZ, region, government type, and education metrics (enrollment, completion, literacy, etc.). Ask for a country by name, "Top N by [metric]", or "compare X and Y". In Global Analytics you can filter by region. For questions about **location or geography** (e.g. where a country is located, which continent, neighbouring countries), use the LLM or web search. For full conversational answers, add your API key in Settings.';

function isLocationQuestionClient(q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return false;

  const hasMetricKeyword = /\b(gdp|population|inflation|debt|unemployment|life expectancy|poverty|per capita|growth|rate|metric|data)\b/i.test(
    s,
  );
  const hasGeoCue = /\bwhere\b|\blocation\b|\bcontinent\b|neighbor(?:ing)?\b|neighbour(?:ing)?\b|border(?:s)?\b/i.test(
    s,
  );
  if (hasGeoCue && !hasMetricKeyword) return true;

  if (
    /where\s+.+\s+located|location\s+of\s+.+|(?:in\s+)?which\s+continent|which\s+continent\s+is/i.test(
      s,
    )
  ) {
    return true;
  }
  if (
    /neighbor(?:ing)?\s+countries?\s+(?:of|around)\s+\w+|which\s+countries\s+border\s+\w+|borders?\s+(?:with|of)\s+\w+/i.test(
      s,
    )
  ) {
    return true;
  }
  if (
    /where\s+is\s+\w+|where\s+\w+\s+is\b/i.test(s) &&
    (s.includes('located') || s.includes('location') || s.length < 40)
  ) {
    return true;
  }
  return false;
}
