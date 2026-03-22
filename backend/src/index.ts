import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Load `.env` from likely locations; `override: true` so values win over empty exported vars in the shell. */
const ENV_CANDIDATES = [
  resolve(process.cwd(), ".env"),
  resolve(__dirname, "../.env"),
  resolve(__dirname, "../../.env"),
];
for (const p of ENV_CANDIDATES) {
  if (existsSync(p)) dotenv.config({ path: p, override: true });
}
if (!process.env.GROQ_API_KEY?.trim()) {
  const tried = ENV_CANDIDATES.filter((p) => existsSync(p));
  console.warn(
    `[cap-backend] GROQ_API_KEY is unset after loading .env (tried: ${tried.length ? tried.join(", ") : "no files found"}). PESTEL/Porter/Assistant use data-only scaffolds.`
  );
}
import cors from "cors";
import express from "express";
import { METRICS, METRIC_BY_ID } from "./metrics.js";
import { listCountries, getCountry, type CountrySummary } from "./restCountries.js";
import { fetchWikidataCountryEnrichment } from "./wikidataCountryProfile.js";
import { fetchSeaAroundUsEezAreaKm2 } from "./seaAroundUsEez.js";
import { EEZ_SQKM_FALLBACK } from "./eezSqKmFallback.js";
import { fetchCountryBundle, fetchMetricSeriesForCountry, allMetricIds } from "./worldBank.js";
import type { SeriesPoint } from "./series.js";
import { fetchGlobalSnapshotWithYearFallback } from "./globalSnapshot.js";
import {
  groqChatWithFallbackForUseCase,
  tavilySearch,
  utcDateDaysAgo,
  utcDateISO,
} from "./llm.js";
import {
  buildPovertyInternationalVsNationalTable,
  tavilyAssistantFallbackReply,
} from "./assistantTavilyFallback.js";
import { clearAllCache, getCache, setCache } from "./cache.js";
import { resetDataWarmupGate, startDataWarmup } from "./dataWarmup.js";
import { fetchWbCountryProfile } from "./wbCountryProfile.js";
import { buildDashboardComparison } from "./dashboardComparison.js";
import { buildGlobalTable, type TableCategory } from "./globalTable.js";
import {
  buildDataOnlyPestel,
  buildPestelLlmDigest,
  mergePestelAnalysis,
  parsePestelAnalysisFromLlm,
  type PestelAnalysis,
} from "./pestelAnalysis.js";
import { pestelAllowedDataYearsHint, sanitizePestelPartial } from "./pestelGrounding.js";
import {
  buildPartialPestelFromTavilyWeb,
  fetchPestelSwotPartialFromTavily,
  fetchPestelTemporalHorizonWeb,
  fetchPestelTavilyExecutiveLayer,
  mergePestelPartials,
  truncatePestelSourceBForLlm,
} from "./pestelTavily.js";
import {
  buildDataOnlyPorter,
  mergePorterAnalysis,
  parsePorterFromLlm,
} from "./porterAnalysis.js";
import { fetchPorterTemporalHorizonWeb, PORTER_TEMPORAL_SECTION_MARKER } from "./porterTavily.js";
import { ILO_ISIC_DIVISIONS } from "./iloIsicDivisions.js";
import { computeCorrelationGlobal } from "./correlationGlobal.js";
import { getMetricShortLabel } from "./metricShortLabels.js";
import {
  MIN_DATA_YEAR,
  clampYear,
  clampYearRange,
  currentDataYear,
  resolveGlobalWdiYear,
} from "./yearBounds.js";
import { listDataProvidersResponse } from "./dataProviders.js";
import { buildAssistantRankingPayload } from "./assistantRankingBlock.js";
import {
  ASSISTANT_MAX_COMPARISON_COUNTRIES,
  buildAssistantWebSearchQuery,
  classifyAssistantIntent,
  extractComparisonCca3s,
  extractCountryCodesMentionedInText,
  finalizeComparisonCodes,
  groqTemperatureForIntent,
  intentPrefersWebFirst,
  isWebSearchContextThin,
  looksLikePovertyInternationalVsNationalComparison,
  questionInvokesFocusCountryPlatformMetrics,
  questionLooksMetricAnchored,
  questionNeedsLiveWebVerification,
  shouldSkipTavilyForPlatformFirst,
  type AssistantIntent,
} from "./assistantIntel.js";
import { stripRedundantRankingTablesFromLlmMarkdown } from "./assistantReplyTableDedupe.js";
import { polishAssistantLlmReply } from "./assistantReplyPolish.js";
import { compactAssistantRetrievalForLlm } from "./assistantCitationContext.js";
import { clampAssistantUserForLlm } from "./assistantPromptBudget.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/metrics", (_req, res) => {
  res.json(METRICS.map((m) => ({ ...m, shortLabel: getMetricShortLabel(m.id) })));
});

app.get("/api/data-providers", (_req, res) => {
  res.json(listDataProvidersResponse());
});

app.get("/api/ilo-isic-divisions", (_req, res) => {
  res.json(ILO_ISIC_DIVISIONS);
});

app.get("/api/countries", async (_req, res) => {
  try {
    const countries = await listCountries();
    res.json(
      countries
        .filter((c) => /^[A-Z]{3}$/.test(c.cca3))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(502).json({ error: msg });
  }
});

app.get("/api/country/:cca3", async (req, res) => {
  try {
    const c = await getCountry(req.params.cca3);
    if (!c) return res.status(404).json({ error: "Country not found" });
    const iso = c.cca3.toUpperCase();
    const [wd, eezApi] = await Promise.all([
      fetchWikidataCountryEnrichment(iso),
      c.landlocked ? Promise.resolve(null) : fetchSeaAroundUsEezAreaKm2(c.ccn3),
    ]);
    const government = c.government ?? wd?.government;
    const headOfGovernmentTitle = wd?.headOfGovernmentTitle;
    const eezSqKm = c.landlocked ? null : eezApi ?? EEZ_SQKM_FALLBACK[iso] ?? null;
    res.json({ ...c, government, headOfGovernmentTitle, eezSqKm });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/country/:cca3/wb-profile", async (req, res) => {
  try {
    const p = await fetchWbCountryProfile(req.params.cca3.toUpperCase());
    res.json(p);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/dashboard/comparison", async (req, res) => {
  try {
    const cca3 = String(req.query.cca3 ?? "").toUpperCase();
    const year = req.query.year
      ? clampYear(parseInt(String(req.query.year), 10))
      : clampYear(currentDataYear() - 1);
    if (!/^[A-Z]{3}$/.test(cca3)) return res.status(400).json({ error: "cca3 required" });
    const data = await buildDashboardComparison(cca3, year);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/cache/clear", (_req, res) => {
  clearAllCache();
  resetDataWarmupGate();
  res.json({ ok: true });
});

/**
 * First-open bootstrap: warms server-side cache for every country + WLD with the full metric catalog
 * and default year span (same payload as GET /api/country/:cca3/series with all metrics). Returns immediately;
 * work continues in the background. Set DISABLE_BOOTSTRAP_WARMUP=1 to skip.
 */
app.post("/api/bootstrap/warm", (_req, res) => {
  if (process.env.DISABLE_BOOTSTRAP_WARMUP === "1") {
    res.json({ status: "skipped", reason: "DISABLE_BOOTSTRAP_WARMUP" });
    return;
  }
  res.status(202).json({
    status: "started",
    message: "Prefetching full country metric bundles into server cache (runs in background).",
  });
  void startDataWarmup().catch((e) => console.error("[bootstrap/warm]", e));
});

function countrySeriesCacheKey(cca3: string, start: number, end: number, metricIds: string[]): string {
  const sorted = [...metricIds].sort().join("\0");
  const h = createHash("sha256").update(sorted).digest("hex").slice(0, 20);
  return `country:series:v3:${cca3}:${start}:${end}:${h}`;
}

const COUNTRY_SERIES_CACHE_TTL_MS = 1000 * 60 * 20;

app.get("/api/country/:cca3/series", async (req, res) => {
  try {
    const idsParam = req.query.metrics as string | undefined;
    const { start, end } = clampYearRange(
      req.query.start ? parseInt(String(req.query.start), 10) : MIN_DATA_YEAR,
      req.query.end ? parseInt(String(req.query.end), 10) : currentDataYear()
    );
    const metricIds = idsParam
      ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : allMetricIds();
    for (const id of metricIds) {
      if (!METRIC_BY_ID[id]) return res.status(400).json({ error: `Unknown metric: ${id}` });
    }
    const cca3 = req.params.cca3.toUpperCase();
    const cacheKey = countrySeriesCacheKey(cca3, start, end, metricIds);
    const cached = getCache<Record<string, SeriesPoint[]>>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const bundle = await fetchCountryBundle(cca3, metricIds, start, end);
    setCache(cacheKey, bundle, COUNTRY_SERIES_CACHE_TTL_MS);
    res.json(bundle);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/global/snapshot", async (req, res) => {
  try {
    const metricId = String(req.query.metric ?? "gdp");
    const requestedYear = req.query.year
      ? clampYear(parseInt(String(req.query.year), 10))
      : clampYear(currentDataYear() - 1);
    if (!METRIC_BY_ID[metricId]) return res.status(400).json({ error: "Unknown metric" });
    const { dataYear, rows } = await fetchGlobalSnapshotWithYearFallback(metricId, requestedYear);
    res.json({ metricId, requestedYear, dataYear, year: dataYear, rows });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/global/table", async (req, res) => {
  try {
    const year = req.query.year
      ? clampYear(parseInt(String(req.query.year), 10))
      : clampYear(currentDataYear() - 1);
    const region = String(req.query.region ?? "All");
    const category = String(req.query.category ?? "general") as TableCategory;
    if (!["general", "financial", "health", "education"].includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }
    const data = await buildGlobalTable(year, region, category);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/global/wld-series", async (req, res) => {
  try {
    const idsParam = String(req.query.metrics ?? "");
    const metricIds = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (metricIds.length === 0) return res.status(400).json({ error: "metrics required" });
    for (const id of metricIds) {
      if (!METRIC_BY_ID[id]) return res.status(400).json({ error: `Unknown metric: ${id}` });
    }
    const { start, end } = clampYearRange(
      req.query.start ? parseInt(String(req.query.start), 10) : MIN_DATA_YEAR,
      req.query.end ? parseInt(String(req.query.end), 10) : currentDataYear()
    );
    const bundle = await fetchCountryBundle("WLD", metricIds, start, end);
    res.json({ start, end, series: bundle });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/compare", async (req, res) => {
  try {
    const countries = String(req.query.countries ?? "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const metricId = String(req.query.metric ?? "gdp_per_capita");
    const { start, end } = clampYearRange(
      req.query.start ? parseInt(String(req.query.start), 10) : MIN_DATA_YEAR,
      req.query.end ? parseInt(String(req.query.end), 10) : currentDataYear()
    );
    if (countries.length === 0) return res.status(400).json({ error: "countries required" });
    if (!METRIC_BY_ID[metricId]) return res.status(400).json({ error: "Unknown metric" });
    const series: Record<string, SeriesPoint[]> = {};
    await Promise.all(
      countries.map(async (iso) => {
        const b = await fetchCountryBundle(iso, [metricId], start, end);
        series[iso] = b[metricId] ?? [];
      })
    );
    res.json({ metricId, series });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

function latestValue(points: { year: number; value: number | null }[]): { year: number; value: number } | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const v = points[i].value;
    if (v !== null && v !== undefined && !Number.isNaN(v)) {
      return { year: points[i].year, value: v };
    }
  }
  return null;
}

function yoyChange(points: { year: number; value: number | null }[]): number | null {
  const last = latestValue(points);
  if (!last) return null;
  const prev = points.filter((p) => p.year === last.year - 1 && p.value !== null);
  if (prev.length === 0) return null;
  const pv = prev[0].value!;
  if (pv === 0) return null;
  return ((last.value - pv) / Math.abs(pv)) * 100;
}

/** Core metrics pulled for the assistant — same pipeline as the dashboard. */
const ASSISTANT_PRIMARY_METRIC_IDS: string[] = [
  "gdp",
  "gdp_ppp",
  "gdp_per_capita",
  "gdp_per_capita_ppp",
  "gdp_growth",
  "population",
  "inflation",
  "gov_debt_pct_gdp",
  "gov_debt_usd",
  "unemployment_ilo",
  "life_expectancy",
  "literacy_adult",
  "poverty_headcount",
  "poverty_national",
  "undernourishment",
  "lending_rate",
];

function formatAssistantMetricValue(id: string, value: number): string {
  const pctIds = new Set([
    "gdp_growth",
    "inflation",
    "gov_debt_pct_gdp",
    "unemployment_ilo",
    "poverty_headcount",
    "poverty_national",
    "undernourishment",
    "literacy_adult",
    "lending_rate",
  ]);
  if (pctIds.has(id)) return `${Number(value.toFixed(1))}%`;
  if (id === "life_expectancy") return `${value.toFixed(1)} years`;
  if (id === "population") {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)} billion`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)} million`;
    return Math.round(value).toLocaleString("en-US");
  }
  if (
    id === "gdp" ||
    id === "gdp_ppp" ||
    id === "gdp_per_capita" ||
    id === "gdp_per_capita_ppp" ||
    id === "gov_debt_usd"
  ) {
    const x = Math.abs(value);
    if (x >= 1e12) return `$${(value / 1e12).toFixed(2)} trillion`;
    if (x >= 1e9) return `$${(value / 1e9).toFixed(2)} billion`;
    if (x >= 1e6) return `$${(value / 1e6).toFixed(2)} million`;
    return `$${Math.round(value).toLocaleString("en-US")}`;
  }
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/**
 * Narrow per-country comparison blocks to metrics the user named.
 * If they use `… on GDP, population`, only the tail after `on` is scanned; otherwise the whole message
 * (so “GDP and inflation for France, Germany” picks both series).
 */
function extractAssistantComparisonMetricIds(message: string): string[] | undefined {
  const hasOn = /\s+on\s+/i.test(message);
  const text = hasOn
    ? message.slice(message.search(/\s+on\s+/i)).replace(/^\s+on\s+/i, "")
    : message;
  const picked: string[] = [];
  const add = (id: string) => {
    if (ASSISTANT_PRIMARY_METRIC_IDS.includes(id) && !picked.includes(id)) picked.push(id);
  };
  if (/\bgdp\s+per\s+capita\s+ppp\b|\bppp\s+per\s+capita\b/i.test(text)) {
    add("gdp_per_capita_ppp");
  } else if (/\bgdp\s+per\s+capita\b|\bper\s+capita\s+gdp\b/i.test(text)) {
    add("gdp_per_capita");
    add("gdp_per_capita_ppp");
  } else if (/\bgdp\b|\bgross\s+domestic\b/i.test(text)) {
    add("gdp");
    add("gdp_ppp");
  }
  if (/\bgdp\s+growth\b|\beconomic\s+growth\s+rate\b/i.test(text)) add("gdp_growth");
  if (/\bpopulation\b|\bpopulous\b/i.test(text)) add("population");
  if (/\bunemployment\b/i.test(text)) add("unemployment_ilo");
  if (/\binflation\b|\bcpi\b/i.test(text)) add("inflation");
  if (/\bdebt\b|\bgovernment\s+debt\b/i.test(text)) {
    add("gov_debt_pct_gdp");
    add("gov_debt_usd");
  }
  if (/\blife\s+expectancy\b/i.test(text)) add("life_expectancy");
  if (/\bliteracy\b/i.test(text)) add("literacy_adult");
  if (/\bpoverty\b/i.test(text)) {
    add("poverty_headcount");
    if (
      /\bnational\b|\binternational\b|\bvs\.?\b|\bversus\b|\bcompare|\bcomparison\b/i.test(text)
    ) {
      add("poverty_national");
    }
  } else if (/\bheadcount\b/i.test(text)) {
    add("poverty_headcount");
  }
  if (/\b(undernourishment|hunger|malnutrition)\b/i.test(text)) add("undernourishment");
  if (/\blending\b|\binterest\s+rate\b/i.test(text)) add("lending_rate");
  return picked.length > 0 ? picked : undefined;
}

function buildAssistantPrimaryDataBlock(
  meta: NonNullable<Awaited<ReturnType<typeof getCountry>>>,
  bundle: Record<string, SeriesPoint[]>,
  metricIds?: string[]
): string {
  const idList =
    metricIds && metricIds.length > 0
      ? metricIds.filter((id) => ASSISTANT_PRIMARY_METRIC_IDS.includes(id))
      : ASSISTANT_PRIMARY_METRIC_IDS;
  const ids = idList.length > 0 ? idList : ASSISTANT_PRIMARY_METRIC_IDS;
  const usedRequestedSubset = Boolean(metricIds && metricIds.length > 0 && idList.length > 0);
  const lines: string[] = [
    `Country: ${meta.name} (${meta.cca3})`,
    `Region: ${meta.region}${meta.subregion ? ` · ${meta.subregion}` : ""}`,
    "",
    usedRequestedSubset
      ? "The following values match the Country Dashboard definitions (subset you asked about). Each line is the latest observation stored in this app for that indicator (data year on the line):"
      : "The following values match the Country Dashboard (World Bank WDI plus configured gap-fills). Each line is the latest observation stored in this app for that indicator (data year on the line):",
    "",
  ];
  for (const id of ids) {
    const pts = bundle[id] ?? [];
    const lv = latestValue(pts);
    if (!lv) continue;
    const label = METRIC_BY_ID[id]?.label ?? id;
    const valStr = formatAssistantMetricValue(id, lv.value);
    const yoy = yoyChange(pts);
    let line = `• ${label}: ${valStr} (data year ${lv.year})`;
    if (yoy !== null) line += `; YoY vs prior year: ${yoy.toFixed(1)}%`;
    lines.push(line);
  }
  return lines.join("\n");
}

app.post("/api/assistant/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const cca3 = req.body?.countryCode ? String(req.body.countryCode).toUpperCase() : "";
    if (!message) return res.status(400).json({ error: "message required" });

    /** When true (UI “web-first” mode), never skip Tavily for platform-heavy intents so retrieval stays fresh. */
    const webSearchPriority =
      req.body?.webSearchPriority === true ||
      req.body?.webSearchPriority === "true" ||
      String(req.body?.assistantMode ?? "").toLowerCase() === "web_priority";

    const countries = await listCountries();
    const intent = classifyAssistantIntent(message);
    const needsVerifiedWeb = questionNeedsLiveWebVerification(message);
    let extractedCompare = extractComparisonCca3s(message, cca3, countries);
    if (extractedCompare.length < 2) {
      const scanned = extractCountryCodesMentionedInText(
        message,
        countries,
        ASSISTANT_MAX_COMPARISON_COUNTRIES
      );
      if (scanned.length >= 2 && questionLooksMetricAnchored(message)) {
        extractedCompare = scanned;
      }
    }
    const comparisonCodes = finalizeComparisonCodes(extractedCompare, cca3, message);
    const comparisonMetricIds = extractAssistantComparisonMetricIds(message);
    const preferWebPrimary = intentPrefersWebFirst(intent);
    const nameByCca3 = new Map(countries.map((c) => [c.cca3, c.name] as const));

    const intentLabel = (i: AssistantIntent): string => {
      switch (i) {
        case "statistics_drill":
          return needsVerifiedWeb
            ? "Statistics / ranking — platform first + live web (ephemeral facts in question)"
            : "Statistics / ranking — platform series first";
        case "country_compare":
          return needsVerifiedWeb
            ? "Country comparison — platform first + live web (ephemeral facts in question)"
            : "Country comparison — platform series first";
        case "country_overview":
          return "Country overview — statistics + optional web";
        default:
          return needsVerifiedWeb
            ? "General — live web grounding (officeholders / current events)"
            : "General — web + model first";
      }
    };

    const attribution: string[] = [
      `Intent: ${intentLabel(intent)}${webSearchPriority ? " · Web search prioritized (user mode)" : ""}`,
    ];

    const [dashFocus, rankingPayload, comparisonBlock] = await Promise.all([
      (async (): Promise<{
        block: string;
        meta?: CountrySummary;
        bundle?: Record<string, SeriesPoint[]>;
      }> => {
        if (!cca3 || !/^[A-Z]{3}$/.test(cca3)) return { block: "" };
        const meta = await getCountry(cca3);
        const bundle = await fetchCountryBundle(cca3, allMetricIds(), MIN_DATA_YEAR, currentDataYear());
        if (!meta) return { block: "" };
        return {
          block: buildAssistantPrimaryDataBlock(meta, bundle),
          meta,
          bundle,
        };
      })(),
      buildAssistantRankingPayload(message, formatAssistantMetricValue, {
        focusCca3: /^[A-Z]{3}$/.test(cca3) ? cca3 : undefined,
      }),
      (async () => {
        if (comparisonCodes.length < 2) return "";
        const parts: string[] = [];
        for (const code of comparisonCodes.slice(0, ASSISTANT_MAX_COMPARISON_COUNTRIES)) {
          const meta = await getCountry(code);
          const bundle = await fetchCountryBundle(code, allMetricIds(), MIN_DATA_YEAR, currentDataYear());
          if (meta) parts.push(buildAssistantPrimaryDataBlock(meta, bundle, comparisonMetricIds));
        }
        return parts.length >= 2 ? parts.join("\n\n────────\n\n") : "";
      })(),
    ]);

    const dashboardBlock = dashFocus.block;
    const dashboardFocusMeta = dashFocus.meta;
    const dashboardFocusBundle = dashFocus.bundle;

    const rankingSection = rankingPayload?.plainBlock ?? "";
    const rankingMarkdownMain = rankingPayload?.markdownTable ?? "";
    const rankingMarkdownFocus = rankingPayload?.focusComparisonMarkdown?.trim() ?? "";
    const rankingMarkdown = [rankingMarkdownMain, rankingMarkdownFocus].filter(Boolean).join("\n\n");
    if (rankingSection) {
      attribution.push(
        "Global ranking: full-country snapshot (same API path as dashboard global view; year may step back for WDI coverage)"
      );
    }
    if (comparisonBlock) {
      attribution.push(
        `Comparison: platform series for ${comparisonCodes.length} countries (max ${ASSISTANT_MAX_COMPARISON_COUNTRIES} per request)`
      );
    }

    const omitDuplicateDashboard =
      Boolean(comparisonBlock) && /^[A-Z]{3}$/.test(cca3) && comparisonCodes.includes(cca3);
    const focusMetricsInScope = questionInvokesFocusCountryPlatformMetrics(message, intent);
    const dashboardForPrompt =
      omitDuplicateDashboard || !focusMetricsInScope ? "" : dashboardBlock;
    if (dashboardBlock.trim() && !focusMetricsInScope) {
      attribution.push("Platform: focus-country indicators omitted (question outside dashboard metric scope)");
    }

    const platformForTavilyFallback = (() => {
      const fm = dashboardFocusMeta;
      const fb = dashboardFocusBundle;
      if (fm && fb && looksLikePovertyInternationalVsNationalComparison(message)) {
        const t = buildPovertyInternationalVsNationalTable(`${fm.name} (${fm.cca3})`, fb);
        if (t) return t;
      }
      if (dashboardBlock.trim() && focusMetricsInScope) {
        const head = fm
          ? `**Latest platform indicators — ${fm.name} (${fm.cca3})**`
          : "**Latest platform indicators**";
        return `${head}\n\n${dashboardBlock}`;
      }
      return "";
    })();

    const hasAuthoritativePayload =
      Boolean(rankingSection) ||
      Boolean(comparisonBlock) ||
      (Boolean(dashboardBlock) && focusMetricsInScope);
    const tavilyConfigured = Boolean(process.env.TAVILY_API_KEY?.trim());
    const skipWebForPlatform =
      !webSearchPriority &&
      tavilyConfigured &&
      shouldSkipTavilyForPlatformFirst(intent, hasAuthoritativePayload, message);

    let webContext = "";
    if (tavilyConfigured && !skipWebForPlatform) {
      const webQuery = buildAssistantWebSearchQuery(message, intent, cca3, comparisonCodes, nameByCca3, {
        boostVerifiedFact: needsVerifiedWeb,
      });
      /** Stats-only web supplement (narrow); disabled when the question mixes in ephemeral facts. */
      const statsSupplementWebOnly =
        intent === "statistics_drill" && !webSearchPriority && !needsVerifiedWeb;
      const today = utcDateISO();

      if (needsVerifiedWeb) {
        webContext = await tavilySearch(webQuery, 6, {
          searchDepth: "advanced",
          includeAnswer: "advanced",
          topic: "news",
          timeRange: "month",
          preferNewestSourcesFirst: true,
        });
        if (isWebSearchContextThin(webContext)) {
          const y = String(new Date().getFullYear());
          const retry = await tavilySearch(
            `${message.replace(/\s+/g, " ").trim()} ${y} current officeholder confirmed news`,
            6,
            {
              searchDepth: "advanced",
              includeAnswer: "advanced",
              topic: "news",
              timeRange: "year",
              startDate: utcDateDaysAgo(400),
              endDate: today,
              preferNewestSourcesFirst: true,
            }
          );
          if (!isWebSearchContextThin(retry)) webContext = retry;
          else if (retry.trim()) webContext = `${webContext}\n\n${retry}`.trim();
        }
        if (isWebSearchContextThin(webContext)) {
          const y = String(new Date().getFullYear());
          const wide = await tavilySearch(`${message.replace(/\s+/g, " ").trim()} ${y}`, 6, {
            searchDepth: "advanced",
            includeAnswer: "advanced",
            topic: "general",
            timeRange: "year",
            preferNewestSourcesFirst: true,
          });
          if (wide.trim().length > webContext.trim().length) webContext = wide;
        }
        if (webContext) {
          attribution.push("Web: Tavily — verified current-affairs (multi-pass retrieval)");
        } else {
          attribution.push("Web: Tavily returned no usable context for verified-fact path");
        }
      } else {
        const strictStart =
          intent === "general_web" && !needsVerifiedWeb
            ? utcDateDaysAgo(21)
            : statsSupplementWebOnly
              ? utcDateDaysAgo(150)
              : utcDateDaysAgo(42);
        webContext = await tavilySearch(webQuery, statsSupplementWebOnly ? 5 : 6, {
          searchDepth: "advanced",
          includeAnswer: "advanced",
          topic: statsSupplementWebOnly ? "general" : "news",
          timeRange: statsSupplementWebOnly ? "month" : "week",
          startDate: strictStart,
          endDate: today,
          preferNewestSourcesFirst: true,
        });
        if (!webContext.trim()) {
          webContext = await tavilySearch(webQuery, statsSupplementWebOnly ? 5 : 6, {
            searchDepth: "advanced",
            includeAnswer: "advanced",
            topic: statsSupplementWebOnly ? "general" : "news",
            timeRange: statsSupplementWebOnly ? "year" : "month",
            preferNewestSourcesFirst: true,
          });
        }
        if (webContext) {
          attribution.push(
            preferWebPrimary
              ? "Web: Tavily (advanced) — primary context"
              : intent === "country_overview"
                ? "Web: Tavily — context alongside dashboard figures"
                : "Web: Tavily — supplementary context"
          );
        } else if (preferWebPrimary || intent === "country_overview") {
          attribution.push("Web: Tavily returned no usable context");
        }
      }
    } else if (skipWebForPlatform) {
      attribution.push("Web: skipped — platform data sufficient for this turn");
    } else if ((preferWebPrimary || intent === "country_overview" || needsVerifiedWeb) && !tavilyConfigured) {
      attribution.push("Web: TAVILY_API_KEY not set");
    }

    const webSearchThin = isWebSearchContextThin(webContext);
    const todayUtc = utcDateISO();

    const cited = compactAssistantRetrievalForLlm({
      dashboardForPrompt,
      comparisonBlock,
      rankingSection,
      webContext,
      webRelevance: {
        message,
        countryName: dashboardFocusMeta?.name,
        cca3: dashboardFocusMeta?.cca3 ?? (/^[A-Z]{3}$/.test(cca3) ? cca3 : undefined),
      },
    });
    const hasCitationKeys =
      Object.keys(cited.citations.D).length + Object.keys(cited.citations.W).length > 0;
    const citationInstruction = hasCitationKeys
      ? `

CITATIONS: In the context below, **platform** facts (dashboard + ranking rows) are prefixed with **[D1], [D2], …**. **At most one** live-web excerpt is provided as **[W1]**—use it only for claims it actually supports. Put the matching tag right after the supported phrase (e.g. "unemployment is near 5% [D6]"). Use only tags that appear in this turn. Do not quote the full labeled reference lines back to the user—the inline tags are enough.`
      : "";

    const humanVoice = `STYLE — read like a thoughtful human analyst, not a chatbot:
- **Direct and warm:** Answer the question in the first sentence or two when you can. Use natural connectors (“Meanwhile…”, “That compares with…”, “On a human-development note…”).
- **Cohesive:** Prefer **2–4 short paragraphs** of flowing prose. Use bullets only when comparing many countries or listing ranked takeaways—never as a default crutch.
- **Invisible machinery:** Never mention prompts, “blocks”, “Tavily”, “payload”, “web context”, “platform data section”, or apologize for what you were “given”.
- **Thread notes:** If you see lines starting with \`[Retrieval:\` or \`[Server:\`, treat them as private instructions—do **not** quote or summarize them to the user.
- **Numbers:** Fold statistics into sentences (“GDP reached about … in 2022 [D3]”)—do not read the list aloud or say “the data shows”. Use a **markdown table** only when **no** ranking leaderboard table is already shown above your text (e.g. multi-country comparisons). If a ranking table is already prepended to the reply, **never** add another pipe table.
- **No meta-footer:** Do not add a “Sources:” or bibliography block; use inline **[D#]** and at most **[W1]** when the context provides them, and the app maps those for the reader.
- **Recency:** When excerpts carry dates, prefer that timeline for current events; do not “correct” fresh reporting with older training intuition.`;

    const rankingTableRendered = Boolean(rankingMarkdown);
    const multiCountry = comparisonCodes.length >= 2;
    const namedMetricCount = comparisonMetricIds?.length ?? 0;

    const systemStatistics = `You are the Country Analytics Platform’s assistant—an experienced macro and data analyst talking to a colleague.

${humanVoice}

DATA FRESHNESS (platform / API / app database):
- Each indicator line is the **latest observation stored in this application** for that series; the **data year** printed on the line is that observation’s year (WDI and extensions can lag the calendar year—never invent a newer year than shown).
- For **metrics, database figures, or API-style indicators**, these lines override model memory and generic web snippets.

TRUTH (non-negotiable):
- Figures in the **official indicator snapshots**, **comparison set**, and **ranking** below are the source of truth for values and rank order. Never substitute memorized tables or guess missing numbers.
- If the user asks for a metric that is not listed, say so in one clear sentence and offer what you *can* say from the snapshot.
- Optional **recent excerpts** below are background only—they must not contradict those official figures.

When both a selected country and a ranking appear, rely on the prepended **markdown tables** for the ordered list and for **how the dashboard focus country compares** to #1 and to the ends of the shown slice.${
      rankingTableRendered
        ? `

RANKING (top / bottom / leaderboard): The user-visible reply **already starts with** platform-built **markdown table(s)** (ranked economies plus, when applicable, **dashboard focus vs leaderboard**). Your body must be **prose only**—**do not output any markdown pipe (\`|\`) tables** and do not re-list ranks, countries, or ISO3s as a table or bullet leaderboard. Use **[D#]** inline cites and interpret the prepended tables in words only.`
        : ""
    }${
      multiCountry && namedMetricCount >= 2
        ? `

MULTI-COUNTRY + MULTI-METRIC: Several economies and **multiple named indicators** appear below. Respond with **one consolidated GitHub-flavored markdown table** (countries × metrics or metrics × countries) using **only** numbers from the labeled lines, with **[D#]** tags on or beside cells.`
        : multiCountry
          ? `

MULTI-COUNTRY: Several economies appear below. If you compare them on **more than one metric**, use a **single markdown table** for the numeric side-by-side, with **[D#]** cites.`
          : ""
    }`;

    const systemWebPrimary = `You are the Country Analytics Platform’s assistant—curious, well-read, and careful with facts. The user’s question is general (places, institutions, culture, current affairs—not a spreadsheet task).

${humanVoice}

TRUTH (non-negotiable):
- **Today is ${todayUtc} (UTC).** For non-database topics, treat “latest” and “current” **relative to this date**; prioritize **recent excerpts** and their publication dates over stale training data.
- When **recent excerpts** below answer the question, lead with them; newer publication dates beat older ones when they conflict.
- If a **country indicator snapshot** is attached, use it only for hard economic/demographic numbers—and never override clearly dated breaking news from excerpts.
${
  needsVerifiedWeb && !webSearchThin
    ? "- **Leadership / who is in office:** If excerpts name the officeholder or cite an inauguration or election date, treat that as authoritative over model cutoff knowledge."
    : needsVerifiedWeb && webSearchThin
      ? "- **Leadership:** Search came back thin. You may draw on general knowledge for stable facts, but for *who holds office right now* say clearly that the user should confirm on an official government or major news site."
      : "- If excerpts are thin, still be helpful; avoid inventing specific headlines or dates you did not see."
}`;

    const ephemeralFactBlock =
      needsVerifiedWeb && !webSearchThin
        ? `

TIME-SENSITIVE ROLES: Offices change hands; trust dated excerpts in the thread over memory. If excerpts name the incumbent, state it plainly. If they do not, do not invent a name—point to official sources.`
        : needsVerifiedWeb && webSearchThin
          ? `

TIME-SENSITIVE ROLES: Retrieval was light—be candid about uncertainty on *current* officeholders; still help on history and context.`
          : "";

    const systemOverview = `You are the Country Analytics Platform’s assistant, drafting a **clear country briefing** for a busy reader.

${humanVoice}

TRUTH (non-negotiable):
- **Today is ${todayUtc} (UTC).** Blend **latest platform indicators** (each line is the newest year stored in the app for that series) with **fresh web context** dated relative to today.
- When indicator lines are present, they are the **spine** of the story **only if** the user wants a broad country picture or explicitly cares about macro/demographic facts. If they narrow the ask (culture-only, language, cuisine, sport, arts, etc.) without requesting economic statistics, lead with that topic and **do not** pad the answer with unrelated WDI-style metrics—at most one short factual clause if it truly helps.
- Excerpts add colour (politics, society, recent themes) but **do not replace** those numbers when numbers are on-topic. Prefer clearly dated material when sources disagree.
- If no snapshot is attached, avoid precise macro figures unless excerpts provide them.

Shape: open with what matters most about the place, develop with stats + context, end with one sentence on what to watch next. One continuous narrative arc.`;

    const systemCompare = `You are the Country Analytics Platform’s assistant, helping someone **compare countries** side by side.

${humanVoice}

DATA FRESHNESS: Each line below is the **latest stored value** in the app for that indicator (year on the line).

TRUTH (non-negotiable):
- **Only** the per-country indicator snapshots below may supply **numeric** comparisons. Contrast GDP, population, growth, inflation, unemployment, debt, life expectancy, literacy, etc. from those lines—**every country with a section** deserves coverage, not just the first two.
- When **two or more metrics** matter for the question, lead with **one consolidated markdown table** (countries as rows, indicators as columns—or the transpose) and optional short prose; use **[D#]** cites.
- If only one or two metrics dominate, a **compact markdown table** still beats long bullet lists.
- If a country’s snapshot is missing, say so once—never back-fill from memory.
- Excerpts are qualitative seasoning only.

Open with the sharpest contrast, then walk the reader through the rest with explicit country names and the exact figures that matter.`;

    const systemBase =
      intent === "general_web"
        ? systemWebPrimary
        : intent === "country_overview"
          ? systemOverview
          : intent === "country_compare"
            ? systemCompare
            : systemStatistics;

    const platformDataScopeSuffix = `

DATA SCOPE (non-negotiable): **[D#]** tags and any **Official indicators** / ranking / comparison lines in this thread are the **only** figures that come from this application’s database/APIs. Use them **only** to support claims they directly answer—never as filler when the user asked about something else (culture, sport, biography, offices, etc.). If the question is outside that numeric scope, answer from web excerpts and proportionate general knowledge without inventing or importing unrelated dashboard statistics. Never tell the user a number is “from the platform” unless it appears on a **[D#]** line you cite.`;

    const system = `${systemBase}${ephemeralFactBlock}${citationInstruction}${platformDataScopeSuffix}`;

    const verifiedRetrievalNote =
      needsVerifiedWeb && webSearchThin && tavilyConfigured
        ? "\n\n[Retrieval: live search returned no substantive excerpts. Answer helpfully using general knowledge where appropriate; for current officeholders or very recent elections, add a short caveat that the user should verify on official or major news sources.]\n"
        : "";
    const noTavilyVerifiedNote =
      needsVerifiedWeb && !tavilyConfigured
        ? "\n\n[Server: live web search is not configured on this deployment. Answer from general knowledge where you can; for who holds office now or very recent political events, clearly caveat uncertainty and suggest official government or major news sources.]\n"
        : "";

    const user = `## Reference
- **Today (UTC):** ${todayUtc}
- **Platform metrics:** When a focus-country snapshot is included below, each line is the **latest year stored in this app** for that series (year on the line). Ranking tables use the snapshot year in the caption. If the focus snapshot is **(none)** because the question is outside dashboard scope, do **not** treat this app as a source for macro figures—use excerpts and general knowledge only.
- **Non-metric / general questions:** Prefer **recent web excerpts** and their dates as “latest” relative to today.

## What they asked
${message}

## Official indicators — focus country (empty if none selected)
${cited.dashboardForPrompt || "(none)"}

## Official indicators — comparison set (empty if not a comparison question)
${cited.comparisonBlock || "(none)"}

## Global ranking snapshot (empty if not a ranking question)
${cited.rankingSection || "(none)"}

## Recent research excerpts (may be empty; use for context and current events, without contradicting official indicators above)
${cited.webContext || "(none)"}${verifiedRetrievalNote}${noTavilyVerifiedNote}${
      looksLikePovertyInternationalVsNationalComparison(message)
        ? `

## Instruction — international vs national poverty
Use **Poverty headcount at $2.15 (2017 PPP)** (international) and **Poverty headcount at national poverty lines** (national) from the platform snapshot when both appear. Answer for the **focus country named in the snapshot**—never substitute another country unless the user explicitly named it. Prefer **one compact markdown table** (indicator, value, data year) plus a short interpretation; cite facts with **[D#]** from the labeled lines only.`
        : ""
    }${
      rankingMarkdown.trim()
        ? `

## Reply format (mandatory)
The message the user sees **opens with** the platform’s ranking markdown table(s) before your text. **Do not include markdown pipe tables in your answer**—write **prose only** with **[D#]** tags. Summarize takeaways; never recreate the leaderboard.`
        : ""
    }`;

    const userForLlm = clampAssistantUserForLlm(user);
    if (userForLlm.length < user.length) {
      attribution.push("Context: prompt trimmed to stay within LLM context limits (full tables may appear above the reply)");
    }

    let assistantLlmText: string | null = null;
    if (process.env.GROQ_API_KEY) {
      try {
        const { text, model, primaryFailed } = await groqChatWithFallbackForUseCase(
          "assistant",
          system,
          userForLlm,
          {
            temperature: needsVerifiedWeb && !webSearchThin ? 0.22 : groqTemperatureForIntent(intent),
            topP: needsVerifiedWeb && !webSearchThin ? 0.86 : 0.9,
            analyticsRecencyHint:
              (needsVerifiedWeb && !webSearchThin) ||
              intent === "general_web" ||
              intent === "country_overview",
          }
        );
        attribution.push(
          primaryFailed
            ? `LLM: Groq — Assistant stack (${model}, fallback after primary error/rate limit)`
            : `LLM: Groq — Assistant stack (${model})`
        );
        assistantLlmText = polishAssistantLlmReply(text);
        if (rankingMarkdown.trim()) {
          assistantLlmText = stripRedundantRankingTablesFromLlmMarkdown(assistantLlmText);
          assistantLlmText = polishAssistantLlmReply(assistantLlmText);
        }
      } catch (groqErr) {
        const brief = groqErr instanceof Error ? groqErr.message : String(groqErr);
        attribution.push(`LLM: Groq exhausted (${brief.slice(0, 220)}${brief.length > 220 ? "…" : ""})`);
        if (tavilyConfigured) {
          const { text, hasSynthesis } = await tavilyAssistantFallbackReply({
            message,
            countryName: dashboardFocusMeta?.name,
            cca3: dashboardFocusMeta?.cca3 ?? (/^[A-Z]{3}$/.test(cca3) ? cca3 : undefined),
            platformSectionMarkdown: platformForTavilyFallback.trim() || undefined,
          });
          attribution.push(
            hasSynthesis
              ? "Fallback: Tavily answer synthesis (all Groq models failed or rate-limited)"
              : "Fallback: Tavily retrieval only (all Groq models failed; weak synthesis)"
          );
          assistantLlmText = polishAssistantLlmReply(text);
          if (rankingMarkdown.trim()) {
            assistantLlmText = stripRedundantRankingTablesFromLlmMarkdown(assistantLlmText);
            assistantLlmText = polishAssistantLlmReply(assistantLlmText);
          }
        }
      }
    }

    if (assistantLlmText !== null) {
      const reply = rankingMarkdown
        ? `${rankingMarkdown.trim()}\n\n${assistantLlmText}`.trim()
        : assistantLlmText;
      return res.json({ reply, attribution, citations: cited.citations });
    }

    const fallbackParts: string[] = [];
    if (rankingMarkdown) {
      fallbackParts.push(rankingMarkdown);
    } else if (rankingSection) {
      fallbackParts.push(`**Global ranking (platform API)**\n\n${rankingSection}`);
    }
    if (comparisonBlock) {
      fallbackParts.push(`**Comparison (platform API)**\n\n${comparisonBlock}`);
    }
    if (dashboardForPrompt) {
      fallbackParts.push(`**Selected country (platform API)**\n\n${dashboardForPrompt}`);
    }
    const fallback =
      fallbackParts.length > 0
        ? `${fallbackParts.join("\n\n---\n\n")}\n\nSet GROQ_API_KEY for a fuller narrative.`
        : `Select a country (ISO3) for country-level metrics, ask a top-N ranking (e.g. top countries by GDP), or set GROQ_API_KEY for general Q&A without fabricated statistics.`;

    res.json({ reply: fallback, attribution, citations: cited.citations });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

function buildDataDigest(
  countryName: string,
  bundle: Record<string, { year: number; value: number | null }[]>
): string {
  const keys = [
    "gdp_growth",
    "inflation",
    "gov_debt_pct_gdp",
    "life_expectancy",
    "gdp_per_capita",
    "population",
    "literacy_adult",
    "unemployment_ilo",
  ];
  const lines: string[] = [`Country: ${countryName}`];
  for (const k of keys) {
    const lv = latestValue(bundle[k] ?? []);
    if (lv) lines.push(`${k} (${lv.year}): ${lv.value}`);
  }
  return lines.join("\n");
}

app.post("/api/analysis/pestel", async (req, res) => {
  try {
    const cca3 = String(req.body?.countryCode ?? "").toUpperCase();
    const year = req.body?.year
      ? clampYear(parseInt(String(req.body.year), 10))
      : clampYear(currentDataYear() - 1);
    if (!/^[A-Z]{3}$/.test(cca3)) return res.status(400).json({ error: "countryCode (ISO3) required" });
    const [meta, bundle, profile] = await Promise.all([
      getCountry(cca3),
      fetchCountryBundle(cca3, allMetricIds(), MIN_DATA_YEAR, currentDataYear()),
      fetchWbCountryProfile(cca3),
    ]);
    const digest = buildPestelLlmDigest(meta?.name ?? cca3, bundle);
    const attribution: string[] = ["PESTEL anchored on World Bank development indicators (dashboard series)"];
    const fallback = buildDataOnlyPestel(meta?.name ?? cca3, cca3, digest, bundle, meta, profile);

    let web = "";
    if (process.env.TAVILY_API_KEY?.trim()) {
      const name = meta?.name ?? cca3;
      const y = String(year);
      const calY = String(new Date().getFullYear());
      const today = utcDateISO();
      const startNews = utcDateDaysAgo(75);
      const startGeneral = utcDateDaysAgo(200);
      const tavilyBase = { searchDepth: "advanced" as const, includeAnswer: "advanced" as const };
      const queries: { label: string; q: string; topic: "general" | "news" }[] = [
        {
          label: "Politics & institutions",
          q: `${name} government politics policy election reform law latest news ${y} ${calY}`,
          topic: "news",
        },
        {
          label: "Economy & markets",
          q: `${name} economy GDP inflation central bank investment trade latest ${y} ${calY}`,
          topic: "news",
        },
        {
          label: "Society & human capital",
          q: `${name} demographics education health labor workforce social policy latest ${calY}`,
          topic: "general",
        },
        {
          label: "Technology, energy & environment",
          q: `${name} technology innovation energy climate sustainability policy latest ${calY}`,
          topic: "general",
        },
        {
          label: "Legal, regulatory & compliance",
          q: `${name} law regulation compliance court reform business licensing tax policy latest ${calY}`,
          topic: "news",
        },
        {
          label: "Multilateral & official economic context",
          q: `World Bank ${name} economy development overview ${y} site:data.worldbank.org OR ${name} IMF Article IV ${calY}`,
          topic: "general",
        },
      ];
      const [blocks, temporalBlock, execPrefix] = await Promise.all([
        Promise.all(
          queries.map(({ q, topic }) =>
            tavilySearch(q, 5, {
              ...tavilyBase,
              topic,
              timeRange: topic === "news" ? "week" : "month",
              startDate: topic === "news" ? startNews : startGeneral,
              endDate: today,
              preferNewestSourcesFirst: true,
            })
          )
        ),
        fetchPestelTemporalHorizonWeb(name, cca3, year),
        fetchPestelTavilyExecutiveLayer(meta?.name ?? cca3, cca3, year),
      ]);
      const webParts: string[] = [];
      for (let i = 0; i < queries.length; i++) {
        const b = blocks[i]?.trim();
        if (b) webParts.push(`### ${queries[i]!.label}\n${b}`);
      }
      web = webParts.join("\n\n");
      if (web) attribution.push("Web context: Tavily (6 topic bundles × 5 results, advanced retrieval, recency-biased)");
      if (execPrefix.trim()) {
        web = `${execPrefix.trim()}${web ? `\n${web}` : ""}`;
        attribution.push(
          "Tavily: executive synthesis prepended to the web research bundle for mixed retrieval + LLM"
        );
      }
      if (temporalBlock.trim()) {
        web = `${web ? `${web}\n\n` : ""}${temporalBlock.trim()}`;
        attribution.push(
          "Tavily: five publication windows (7d, 1mo, 6mo, 1y, 5y) with date-bounded cross-PESTEL search per window"
        );
      }
    }

    const todayIso = utcDateISO();
    const webFull = web;
    /** Groq rejects oversized user payloads (413); grounding / Tavily-only paths still use the full bundle. */
    const PESTEL_LLM_WEB_CAP = 26_000;
    const { text: webForLlm, truncated: sourceBTruncated } = truncatePestelSourceBForLlm(webFull, PESTEL_LLM_WEB_CAP);
    if (sourceBTruncated) {
      attribution.push(
        `NOTICE: Web research bundle trimmed to ${PESTEL_LLM_WEB_CAP} chars for Groq limits — full text kept for grounding & Tavily fallback`
      );
    }
    const webPresent = Boolean(webFull.trim());
    const hasTemporalWindows = webFull.includes("Multi-horizon web research");
    const staticProfile = [
      `Government type (country profile): ${meta?.government ?? "—"}`,
      `Region: ${meta?.region ?? "—"}${meta?.subregion ? ` · Subregion: ${meta.subregion}` : ""}`,
      `World Bank income level: ${profile?.incomeLevel ?? "—"}`,
      typeof meta?.area === "number" ? `Land area (km², country profile): ${meta.area}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const narrativeRules = `
SCOPE: You analyze **only** ${meta?.name ?? cca3} (${cca3}). Do not substitute another country’s facts. Regional peers may be mentioned only as comparison, without attributing their statistics to this country.

VOICE & CLIENT OUTPUT (non-negotiable):
- Write for **executives and board readers**: cohesive, fluid **memo-style** prose. Every JSON string you output is **client-facing**—never paste internal retrieval labels, markdown headings from the research bundle, bracketed “model notes,” or engineering terms.
- **Forbidden in user-visible text:** “SOURCE A”, “SOURCE B”, “Source A/B”, “STATIC PROFILE”, “Past 7 days”, “Past 1 month”, “temporal window”, subsection titles from the web bundle, or raw “YYYY-MM-DD → YYYY-MM-DD” range lines. Instead use natural language, e.g. “Official series show … (year)”, “Recent reporting suggests …”, “Over the last several months …”, “Longer-run patterns indicate …”.
- **Also avoid** product/engineering scaffolding in client strings: “From platform metadata”, “Data layer:”, “REST Countries”, “WDI-backed”, “the application’s … series”—write as a consultant would (“the reference profile …”, “reported indicators …”, “official development statistics …”).
- Weave **platform statistics** and **web themes** into single flowing sentences; do not structure bullets as “(1) data (2) web (3) implication” explicitly.

ANTI-HALLUCINATION (hard rules — violations invalidate the output):
- **No numbers** (%, GDP, population, rates, years as data claims, rankings) unless they appear in the **platform INDICATORS** block, the **country profile** lines, or **explicitly** in web research snippets below. Never pull statistics from model training memory.
- **Year discipline:** For any digest/WDI statistic, the **year cited must match the INDICATORS line** for that metric (see VALID DATA YEARS below). Do not label 2024 data as 2026 or use a future year as an observation year.
- **No named people** (heads of state, ministers, CEOs, party leaders) unless that **exact name** appears in web excerpts. Otherwise use generic roles (“the government”, “the central bank”) or omit.
- **No specific events** (election outcomes, coups, deals, sanctions) unless web excerpts support them. If unsupported, do not invent—use conditional language (“Where coverage mentions …”) or omit.
- **No fake citations** (“studies show”, “reports indicate”) unless traceable to excerpt wording. For quantitative claims from the indicator list, prefer “Series show … (year …)”.
- Web excerpts are **unverified** third-party text: if they conflict, note uncertainty briefly; do not fabricate reconciliation.
- Do **not** use blanket dismissals such as “No specific recent web sources were identified as of ${todayIso}” unless **all** web research below is effectively empty (no substantive synthesis or snippets anywhere). If material exists, you **must** use it in fluid prose **without** naming internal buckets.

NARRATIVE & EVIDENCE ORDER (internal discipline—do not label this in the JSON):
- Today's date is **${todayIso} (UTC)**. Prefer **newer** published dates in snippets when they conflict with older lines.
- **Logical flow** in each bullet/paragraph: anchor with **verified platform metrics + year** where relevant; add **web-based** qualitative colour only when excerpts support it; close with a **brief** implication stated as your judgment, not as new facts.
${
  hasTemporalWindows
    ? `
- The web bundle includes **multi-horizon slices** (very recent through multi-year lenses) for synthesis only. **Integrate** findings across time naturally (e.g. “near-term press”, “over the past year”, “longer structural trends”)—**never** quote the slice headings or date-range stamps verbatim in client text.`
    : ""
}
${
  webPresent
    ? ""
    : `
- **No web research** is available. Do **not** invent internet-era facts. For every PESTEL comprehensive subsection except Executive summary: paragraph 2 must be **one or two short sentences** stating that live web context was not available and that qualitative colour rests on platform indicators and country profile only. Executive summary paragraph 2 may say once that live web context was unavailable.`
}
- PESTEL & SWOT bullets: tight, analytical mini-paragraphs; no laundry lists of internal labels.
- Comprehensive & strategicBusiness: **exactly three paragraphs** each (blank line between), each paragraph reads as **one continuous argument**, not a labeled outline.
- TECHNOLOGICAL: use literacy / enrollment / education spend from **indicators** for skills; never use GDP per capita as digital adoption. Digital policy themes only when web excerpts support them.
- strategicBusiness: four distinct voices; no duplicated closings across quadrants.
- **SWOT integrity:** Each quadrant must contain **five genuinely distinct** points. **Do not** repeat, paraphrase, or paste the same idea across strengths, weaknesses, opportunities, or threats. If a fact could fit two quadrants, place it **once** where it is strongest and develop a **different** angle for the other quadrant.`;

    const jsonSchemaHint = `Return ONLY a JSON object (no markdown) with exactly this structure (counts are strict). All string values must read as **polished analyst prose**—no internal labels (see VOICE rules above).
{
  "pestelDimensions": [
    {"letter":"P","label":"POLITICAL","bullets":["EXACTLY 5 fluent bullets blending verified indicators with web themes where supported"]},
    {"letter":"E","label":"ECONOMIC","bullets":["EXACTLY 5"]},
    {"letter":"S","label":"SOCIOCULTURAL","bullets":["EXACTLY 5"]},
    {"letter":"T","label":"TECHNOLOGICAL","bullets":["EXACTLY 5"]},
    {"letter":"E","label":"ENVIRONMENTAL","bullets":["EXACTLY 5"]},
    {"letter":"L","label":"LEGAL","bullets":["EXACTLY 5"]}
  ],
  "swot": {
    "strengths": ["EXACTLY 5 coherent bullets"],
    "weaknesses": ["EXACTLY 5"],
    "opportunities": ["EXACTLY 5"],
    "threats": ["EXACTLY 5"]
  },
  "comprehensiveSections": [
    {"title":"Executive summary","body":"EXACTLY three flowing paragraphs (blank lines between): macro snapshot from official series with years; cross-cutting themes from recent coverage as of ${todayIso}; outlook and what to monitor."},
    {"title":"Political factors","body":"EXACTLY three integrated paragraphs: anchors from indicators/profile, web-supported political context, implications."},
    {"title":"Economic factors","body":"EXACTLY three paragraphs: same integrated pattern."},
    {"title":"Sociocultural factors","body":"EXACTLY three paragraphs: same pattern."},
    {"title":"Technological factors","body":"EXACTLY three paragraphs: same pattern."},
    {"title":"Environmental factors","body":"EXACTLY three paragraphs: same pattern."},
    {"title":"Legal factors","body":"EXACTLY three paragraphs: same pattern."}
  ],
  "strategicBusiness": [
    {"title":"Strengths","paragraphs":["EXACTLY three strings: grounded strengths, external validation from coverage, how to operationalize"]},
    {"title":"Weaknesses","paragraphs":["EXACTLY three strings: data gaps or structural frictions, external risks from coverage, mitigation"]},
    {"title":"Opportunities","paragraphs":["EXACTLY three strings: indicator-backed openings, catalysts from coverage, sequencing"]},
    {"title":"Threats","paragraphs":["EXACTLY three strings: dashboard risk signals, external shocks from coverage, resilience"]}
  ],
  "newMarketAnalysis": ["EXACTLY 5 bullets for market entry / expansion"],
  "keyTakeaways": ["EXACTLY 5 bullets"],
  "recommendations": ["EXACTLY 5 actionable bullets (Key recommendations)"]
}`;

    const validYearsLine = pestelAllowedDataYearsHint(bundle);

    const prompt = `Country: ${meta?.name ?? cca3} (${cca3}). Context year for digest alignment: ${year}. **Calendar "as of today" for web layer: ${todayIso} (UTC).**
${narrativeRules}

VALID DATA YEARS (mandatory):
${validYearsLine}

${jsonSchemaHint}

STATIC PROFILE (API ground truth — do not contradict):
${staticProfile}

PLATFORM INDICATORS — Latest non-null year per series (ground all numeric claims here unless the same figure appears in web excerpts):
${digest}

WEB RESEARCH EXCERPTS — Live retrieval as of ${todayIso} (may be empty). Synthesize into fluent prose; use only supported themes—never invent details:
${webForLlm || "(none — no web excerpts; follow empty-web rules above)"}`;

    if (!process.env.GROQ_API_KEY) {
      attribution.push("LLM: disabled — structured data-only template (set GROQ_API_KEY for AI narrative)");
      if (process.env.TAVILY_API_KEY?.trim() && webFull.trim()) {
        let tavilyPartial: Partial<PestelAnalysis> | null = buildPartialPestelFromTavilyWeb(webFull);
        const swotP = await fetchPestelSwotPartialFromTavily(meta?.name ?? cca3, year);
        if (tavilyPartial && swotP) tavilyPartial = mergePestelPartials(tavilyPartial, swotP);
        else if (!tavilyPartial) tavilyPartial = swotP ?? null;
        if (tavilyPartial) {
          attribution.push(
            "PESTEL: Tavily-mixed assembly (no Groq — dimensions from web bundles + SWOT pass; merged with data scaffold)"
          );
          const groundingCtx = { bundle, digest, staticProfile, web: webFull };
          const { partial: groundedPartial, droppedFragments } = sanitizePestelPartial(tavilyPartial, groundingCtx);
          if (droppedFragments > 0) {
            attribution.push(
              `Grounding filter removed ${droppedFragments} fragment(s) not supported by indicators, profile, or web corpus`
            );
          }
          return res.json({ analysis: mergePestelAnalysis(groundedPartial, fallback), attribution });
        }
      }
      return res.json({ analysis: fallback, attribution });
    }

    const pestelJsonSystem = `You are a senior macro-strategy analyst. Output **only** valid JSON matching the user schema.

**Grounding:** every statistic must come from the country profile block, the platform indicator list, or explicit text in web research excerpts. Never use pretrained knowledge to add numbers, names of officials, or events. If evidence is thin, say so briefly in natural language—never reference internal source codes.

**Client voice:** every string must read as a finished **board-ready** narrative—cohesive, fluid, free of engineering labels (no “Source A/B”, no pasted retrieval headings or date-range stamps).

The API may **discard** fragments whose figures are not supported by the evidence bundle—fabricating numbers wastes tokens.

Exact counts: 5 bullets per PESTEL dimension; 5 per SWOT quadrant; 5 for newMarketAnalysis, keyTakeaways, recommendations; 3 paragraphs per comprehensive section and per strategicBusiness quadrant. Varied prose; no duplicated section openings. SWOT: zero cross-quadrant copy-paste—each of the 20 SWOT bullets must be unique in substance.`;

    const runGroqPestelJson = async (useCase: "pestel" | "assistant", label: string): Promise<PestelAnalysis> => {
      const { text, model, primaryFailed } = await groqChatWithFallbackForUseCase(useCase, pestelJsonSystem, prompt, {
        jsonObject: true,
        analyticsRecencyHint: false,
        temperature: 0.06,
        topP: 0.85,
      });
      attribution.push(
        primaryFailed
          ? `LLM: Groq — ${label} (${model}, fallback model in stack)`
          : `LLM: Groq — ${label} (${model})`
      );
      const partial = parsePestelAnalysisFromLlm(text);
      const groundingCtx = { bundle, digest, staticProfile, web: webFull };
      if (!partial) {
        attribution.push("LLM: response was not valid PESTEL JSON — returning data scaffold merge");
        return fallback;
      }
      const { partial: groundedPartial, droppedFragments } = sanitizePestelPartial(partial, groundingCtx);
      if (droppedFragments > 0) {
        attribution.push(
          `LLM: grounding filter removed ${droppedFragments} fragment(s) with years/figures not supported by indicators, profile, or web corpus`
        );
      }
      return mergePestelAnalysis(groundedPartial, fallback);
    };

    try {
      const analysis = await runGroqPestelJson("pestel", "PESTEL stack + web research bundle (mixed retrieval + JSON LLM)");
      res.json({ analysis, attribution });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      attribution.push(
        `LLM: Groq PESTEL stack failed — ${msg.slice(0, 200)}${msg.length > 200 ? "…" : ""}`
      );
      if (process.env.GROQ_API_KEY?.trim()) {
        try {
          const analysis = await runGroqPestelJson(
            "assistant",
            "Assistant stack retry (same JSON schema; mixed Tavily + alternate Groq models)"
          );
          res.json({ analysis, attribution });
          return;
        } catch (e2) {
          const msg2 = e2 instanceof Error ? e2.message : String(e2);
          attribution.push(
            `LLM: Groq Assistant stack failed — ${msg2.slice(0, 200)}${msg2.length > 200 ? "…" : ""}`
          );
        }
      }
      if (process.env.TAVILY_API_KEY?.trim() && webFull.trim()) {
        let tavilyPartial: Partial<PestelAnalysis> | null = buildPartialPestelFromTavilyWeb(webFull);
        const swotP = await fetchPestelSwotPartialFromTavily(meta?.name ?? cca3, year);
        if (tavilyPartial && swotP) tavilyPartial = mergePestelPartials(tavilyPartial, swotP);
        else if (!tavilyPartial) tavilyPartial = swotP ?? null;
        if (tavilyPartial) {
          attribution.push(
            "PESTEL: Tavily-mixed fallback (dimension bullets from Tavily bundles + dedicated SWOT search; merged with data scaffold)"
          );
          const groundingCtx = { bundle, digest, staticProfile, web: webFull };
          const { partial: groundedPartial, droppedFragments } = sanitizePestelPartial(tavilyPartial, groundingCtx);
          if (droppedFragments > 0) {
            attribution.push(
              `Grounding filter removed ${droppedFragments} fragment(s) not supported by indicators, profile, or web corpus`
            );
          }
          res.json({ analysis: mergePestelAnalysis(groundedPartial, fallback), attribution });
          return;
        }
      }
      attribution.push("Using data-only scaffold (no usable Tavily assembly)");
      res.json({ analysis: fallback, attribution });
    }
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/analysis/porter", async (req, res) => {
  try {
    const cca3 = String(req.body?.countryCode ?? "").toUpperCase();
    const year = req.body?.year
      ? clampYear(parseInt(String(req.body.year), 10))
      : clampYear(currentDataYear() - 1);
    const industrySector = String(req.body?.industrySector ?? "10 - Manufacture of food products").trim();
    if (!/^[A-Z]{3}$/.test(cca3)) return res.status(400).json({ error: "countryCode (ISO3) required" });

    const [meta, bundle, profile] = await Promise.all([
      getCountry(cca3),
      fetchCountryBundle(cca3, allMetricIds(), MIN_DATA_YEAR, currentDataYear()),
      fetchWbCountryProfile(cca3),
    ]);
    const digest = buildDataDigest(meta?.name ?? cca3, bundle);
    const attribution: string[] = ["Porter scaffold from macro/demographic indicators (proxy view)"];
    const fallback = buildDataOnlyPorter(
      meta?.name ?? cca3,
      cca3,
      industrySector,
      digest,
      bundle,
      meta,
      profile
    );

    let webFull = "";
    if (process.env.TAVILY_API_KEY?.trim()) {
      const name = meta?.name ?? cca3;
      const calY = String(new Date().getFullYear());
      const today = utcDateISO();
      const startNews = utcDateDaysAgo(90);
      const startGeneral = utcDateDaysAgo(200);
      const tavilyBase = { searchDepth: "advanced" as const, includeAnswer: "advanced" as const };
      const queries: { label: string; q: string; topic: "general" | "news" }[] = [
        {
          label: "Industry competition & market structure",
          q: `${name} ${industrySector} Porter five forces competitive rivalry market structure M&A consolidation ${year} ${calY}`,
          topic: "news",
        },
        {
          label: "Regulation, trade, investment & entry barriers",
          q: `${name} ${industrySector} regulation FDI trade policy licensing barriers to entry ${calY}`,
          topic: "general",
        },
        {
          label: "Supply chain, suppliers, buyers & demand",
          q: `${name} ${industrySector} supply chain input costs consumers retailers buyer power ${calY}`,
          topic: "general",
        },
      ];
      const [blocks, temporalBlock] = await Promise.all([
        Promise.all(
          queries.map(({ q, topic }) =>
            tavilySearch(q, 6, {
              ...tavilyBase,
              topic,
              timeRange: topic === "news" ? "month" : "month",
              startDate: topic === "news" ? startNews : startGeneral,
              endDate: today,
              preferNewestSourcesFirst: true,
            })
          )
        ),
        fetchPorterTemporalHorizonWeb(name, cca3, industrySector, year),
      ]);
      const webParts: string[] = [];
      for (let i = 0; i < queries.length; i++) {
        const b = blocks[i]?.trim();
        if (b) webParts.push(`### ${queries[i]!.label}\n${b}`);
      }
      webFull = webParts.join("\n\n");
      if (!webFull.trim()) {
        webFull = await tavilySearch(
          `${name} ${industrySector} industry market competition trends Porter analysis ${year} ${calY}`,
          8,
          {
            searchDepth: "advanced",
            includeAnswer: "advanced",
            topic: "general",
            timeRange: "year",
            preferNewestSourcesFirst: true,
          }
        );
      }
      if (temporalBlock.trim()) {
        webFull = webFull.trim() ? `${webFull.trim()}\n\n${temporalBlock.trim()}` : temporalBlock.trim();
        attribution.push(
          "Tavily: Porter five publication windows (7d, 1mo, 6mo, 1y, 5y) for industry five-forces context"
        );
      }
      if (webFull.trim()) attribution.push("Web context: Tavily (multi-topic industry retrieval + fallback if needed)");
    }

    const todayIso = utcDateISO();
    const hasTemporalWindows = webFull.includes(PORTER_TEMPORAL_SECTION_MARKER);
    const PORTER_LLM_WEB_CAP = 26_000;
    const { text: webForLlm, truncated: porterWebTruncated } = truncatePestelSourceBForLlm(webFull, PORTER_LLM_WEB_CAP);
    if (porterWebTruncated) {
      attribution.push(
        `NOTICE: Porter web bundle trimmed to ${PORTER_LLM_WEB_CAP} chars for Groq limits — full text used where feasible for retrieval`
      );
    }
    const webPresent = Boolean(webFull.trim());

    const porterNarrativeRules = `
SCOPE: Analyze **only** ${meta?.name ?? cca3} (${cca3}) and industry **${industrySector}**.

PRIORITY (non-negotiable):
1) **First** anchor every quantitative claim in the **PLATFORM INDICATORS** digest below—use the **latest year shown** for each series. Do not invent statistics from memory.
2) **Then** enrich with **web research** (SOURCE B) for industry structure, regulation, channels, and competitive dynamics. Integrate themes across recency: very recent news, the past month, half-year, year, and multi-year structure where excerpts support it.

VOICE & CLIENT OUTPUT:
- Every JSON string is **client-facing** board-ready prose—no "SOURCE A/B", no pasted internal subsection titles, no raw date-range stamps from the research bundle.
- Cohesive paragraphs; no bullet lists inside comprehensive \`body\` fields.
${
  hasTemporalWindows
    ? `
- The bundle includes **multi-horizon slices**. Integrate them naturally (e.g. "in recent reporting", "over the past year", "longer-run structure")—**never** quote slice headings verbatim.`
    : ""
}
${
  webPresent
    ? ""
    : `
- **No web research** is available. State briefly in paragraph 2 of each comprehensive section (except Executive Summary may say once in paragraph 2) that live web context was unavailable; still deliver three paragraphs using digest + careful sector inference.`
}

NARRATIVE & SOURCE INTEGRATION (mandatory):
- Each comprehensive \`body\` is **EXACTLY three prose paragraphs**, separated by one blank line (\\n\\n). No markdown inside \`body\`.
- Paragraph 1: **Digest-first**—concrete metrics with matching years from the indicator list; tie to this ISIC sector.
- Paragraph 2: Web-supported themes for that force (competition, regulation, supply chain, substitutes, buyers)—blend time horizons when excerpts allow. If thin, say so once briefly.
- Paragraph 3: Strategy implications **specific to that force only**—no duplicated closing across sections.
- **Forces bullets:** five distinct, analytical mini-paragraphs per force; digest anchors before speculative industry colour.
- **newMarketAnalysis, keyTakeaways, recommendations:** each **exactly five** bullets, non-redundant, digest-aware where metrics apply.
- Quantitative claims only from the digest or explicit figures in web excerpts.`;

    const jsonSchemaHint = `Return ONLY a JSON object (no markdown) with exactly this structure (counts are strict):
{
  "forces": [
    {"number":1,"title":"Threat of New Entry","accent":"threat_new_entry","bullets":["EXACTLY 5 fluent bullets; lead with digest-backed facts where relevant, then industry logic"]},
    {"number":2,"title":"Supplier Power","accent":"supplier_power","bullets":["EXACTLY 5"]},
    {"number":3,"title":"Buyer Power","accent":"buyer_power","bullets":["EXACTLY 5"]},
    {"number":4,"title":"Threat of Substitution","accent":"threat_substitutes","bullets":["EXACTLY 5"]},
    {"number":5,"title":"Competitive Rivalry","accent":"rivalry","bullets":["EXACTLY 5"]}
  ],
  "comprehensiveSections": [
    {"title":"Executive Summary","body":"EXACTLY three paragraphs (\\n\\n between). (1) Country + industry + **digest metrics with years**. (2) Competitive / policy themes from web across time horizons. (3) Integrated five-forces outlook and what to monitor."},
    {"title":"1. Threat of new entrants","body":"EXACTLY three paragraphs: digest entry economics first; web on regulation/investment/disruption; implications for entry threat."},
    {"title":"2. Bargaining power of suppliers","body":"EXACTLY three paragraphs: digest macro/input proxies first; web on supply chain and commodities; supplier power implications."},
    {"title":"3. Bargaining power of buyers","body":"EXACTLY three paragraphs: digest demand/income/labour first; web on channels and pricing; buyer power implications."},
    {"title":"4. Threat of substitutes","body":"EXACTLY three paragraphs: digest trade/income/tech proxies first; web on alternatives and innovation; substitute threat implications."},
    {"title":"5. Competitive rivalry","body":"EXACTLY three paragraphs: digest growth/macro rivalry signals first; web on competitors and pricing; rivalry implications."}
  ],
  "newMarketAnalysis": ["EXACTLY 5 bullets"],
  "keyTakeaways": ["EXACTLY 5 bullets"],
  "recommendations": ["EXACTLY 5 actionable bullets"]
}
Ground numbers in the PLATFORM INDICATORS block when available. Be specific to the country and industry sector.`;

    const prompt = `Country: ${meta?.name ?? cca3} (${cca3}). Industry/Sector: ${industrySector}. Digest alignment year: ${year}. **Calendar "as of" for web layer: ${todayIso} (UTC).**
${porterNarrativeRules}

${jsonSchemaHint}

PLATFORM INDICATORS — Latest non-null year per series (prioritize these for all numeric claims):
${digest}

WEB RESEARCH — Tavily excerpts (may be empty). Synthesize; do not invent facts:
${webForLlm || "(none — follow no-web rules above)"}`;

    if (!process.env.GROQ_API_KEY) {
      attribution.push("LLM: disabled — data-only template (set GROQ_API_KEY for sector narrative)");
      return res.json({ analysis: fallback, attribution });
    }
    try {
      const { text, model, primaryFailed } = await groqChatWithFallbackForUseCase(
        "porter",
        `You are a competitive strategy analyst. Output **only** valid JSON. Every string is client-facing: no "SOURCE A/B", no internal labels. Exactly **5 bullets** per force; **3 paragraphs** per comprehensive body; **5 bullets** each for newMarketAnalysis, keyTakeaways, and recommendations. Prioritize PLATFORM INDICATORS for numbers and years, then web themes across time horizons.`,
        prompt,
        { jsonObject: true, analyticsRecencyHint: true }
      );
      attribution.push(
        primaryFailed
          ? `LLM: Groq — Porter stack (${model}, fallback after primary error)`
          : `LLM: Groq — Porter stack (${model})`
      );
      const partial = parsePorterFromLlm(text);
      const analysis = partial ? mergePorterAnalysis(partial, fallback) : fallback;
      res.json({ analysis, attribution });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      attribution.push(`LLM: Groq failed — ${msg.slice(0, 200)}${msg.length > 200 ? "…" : ""}; using data scaffold`);
      res.json({ analysis: fallback, attribution });
    }
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/analysis/correlation-global", async (req, res) => {
  try {
    const metricX = String(req.query.metricX ?? "gdp_per_capita").trim();
    const metricY = String(req.query.metricY ?? "life_expectancy").trim();
    const { start: s0, end: e0 } = clampYearRange(
      req.query.start ? parseInt(String(req.query.start), 10) : MIN_DATA_YEAR,
      req.query.end ? parseInt(String(req.query.end), 10) : currentDataYear()
    );
    const endYear = resolveGlobalWdiYear(e0);
    const startYear = Math.min(s0, endYear);
    const excludeIqr = String(req.query.excludeIqr ?? "false").toLowerCase() === "true";
    const highlightCountry = String(req.query.highlight ?? "").toUpperCase();
    if (!METRIC_BY_ID[metricX] || !METRIC_BY_ID[metricY]) {
      return res.status(400).json({ error: "Unknown metricX or metricY" });
    }
    const result = await computeCorrelationGlobal(
      metricX,
      metricY,
      startYear,
      endYear,
      excludeIqr,
      highlightCountry
    );
    res.json({
      ...result,
      metricX,
      metricY,
      labelX: getMetricShortLabel(metricX),
      labelY: getMetricShortLabel(metricY),
      startYear,
      endYear,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/analysis/correlation", async (req, res) => {
  try {
    const cca3 = String(req.body?.countryCode ?? "").toUpperCase();
    const xId = String(req.body?.metricX ?? "");
    const yId = String(req.body?.metricY ?? "");
    if (!/^[A-Z]{3}$/.test(cca3)) return res.status(400).json({ error: "countryCode required" });
    if (!METRIC_BY_ID[xId] || !METRIC_BY_ID[yId]) return res.status(400).json({ error: "Unknown metric" });
    const { start, end } = clampYearRange(MIN_DATA_YEAR, currentDataYear());
    const pairBundle = await fetchCountryBundle(cca3, [xId, yId], start, end);
    const xs = pairBundle[xId] ?? [];
    const ys = pairBundle[yId] ?? [];
    const byYear = new Map<number, { x: number; y: number }>();
    for (const p of xs) {
      if (p.value === null) continue;
      byYear.set(p.year, { x: p.value, y: NaN });
    }
    for (const p of ys) {
      if (p.value === null) continue;
      const row = byYear.get(p.year);
      if (row) row.y = p.value;
    }
    const pairs = [...byYear.values()].filter((r) => !Number.isNaN(r.x) && !Number.isNaN(r.y));
    const n = pairs.length;
    if (n < 3) return res.json({ n, correlation: null, points: pairs, note: "Not enough overlapping years" });
    const mx = pairs.reduce((s, p) => s + p.x, 0) / n;
    const my = pairs.reduce((s, p) => s + p.y, 0) / n;
    let num = 0,
      dx = 0,
      dy = 0;
    for (const p of pairs) {
      const zx = p.x - mx;
      const zy = p.y - my;
      num += zx * zy;
      dx += zx * zx;
      dy += zy * zy;
    }
    const denom = Math.sqrt(dx * dy);
    const r = denom === 0 ? null : num / denom;
    res.json({
      n,
      correlation: r,
      points: pairs,
      metricX: xId,
      metricY: yId,
      labelX: getMetricShortLabel(xId),
      labelY: getMetricShortLabel(yId),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Country Analytics API http://localhost:${port}`);
});
