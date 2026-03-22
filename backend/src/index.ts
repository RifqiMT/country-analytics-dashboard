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
import { listCountries, getCountry } from "./restCountries.js";
import { fetchWikidataCountryEnrichment } from "./wikidataCountryProfile.js";
import { fetchSeaAroundUsEezAreaKm2 } from "./seaAroundUsEez.js";
import { EEZ_SQKM_FALLBACK } from "./eezSqKmFallback.js";
import { fetchCountryBundle, fetchMetricSeriesForCountry, allMetricIds } from "./worldBank.js";
import type { SeriesPoint } from "./series.js";
import { fetchGlobalSnapshotWithYearFallback } from "./globalSnapshot.js";
import {
  groqChatWithFallbackForUseCase,
  tavilyAssistantFallbackReply,
  tavilySearch,
  utcDateDaysAgo,
  utcDateISO,
} from "./llm.js";
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
  finalizeComparisonCodes,
  groqTemperatureForIntent,
  intentPrefersWebFirst,
  isWebSearchContextThin,
  questionNeedsLiveWebVerification,
  shouldSkipTavilyForPlatformFirst,
  type AssistantIntent,
} from "./assistantIntel.js";

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

/** When the user adds `on GDP, population, …`, narrow assistant comparison blocks to those series. */
function extractAssistantComparisonMetricIds(message: string): string[] | undefined {
  if (!/\s+on\s+/i.test(message)) return undefined;
  const onIdx = message.search(/\s+on\s+/i);
  const tail = message.slice(onIdx).replace(/^\s+on\s+/i, "");
  const picked: string[] = [];
  const add = (id: string) => {
    if (ASSISTANT_PRIMARY_METRIC_IDS.includes(id) && !picked.includes(id)) picked.push(id);
  };
  if (/\bgdp\s+per\s+capita\b/i.test(tail)) {
    add("gdp_per_capita");
    add("gdp_per_capita_ppp");
  } else if (/\bgdp\b/i.test(tail)) {
    add("gdp");
    add("gdp_ppp");
  }
  if (/\bgdp\s+growth\b/i.test(tail)) add("gdp_growth");
  if (/\bpopulation\b/i.test(tail)) add("population");
  if (/\bunemployment\b/i.test(tail)) add("unemployment_ilo");
  if (/\binflation\b/i.test(tail)) add("inflation");
  if (/\bdebt\b/i.test(tail)) {
    add("gov_debt_pct_gdp");
    add("gov_debt_usd");
  }
  if (/\blife\s+expectancy\b/i.test(tail)) add("life_expectancy");
  if (/\bliteracy\b/i.test(tail)) add("literacy_adult");
  if (/\bpoverty\b/i.test(tail)) add("poverty_headcount");
  if (/\b(undernourishment|hunger|malnutrition)\b/i.test(tail)) add("undernourishment");
  if (/\blending\b|\binterest\s+rate\b/i.test(tail)) add("lending_rate");
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
      ? "Figures below (subset requested in the question) are from the same series as the dashboard. Latest non-null year per indicator:"
      : "Figures below are from the same series as the dashboard (WDI + configured gap-fills). Latest non-null year per indicator:",
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
    const extractedCompare = extractComparisonCca3s(message, cca3, countries);
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

    const [dashboardBlock, rankingPayload, comparisonBlock] = await Promise.all([
      (async () => {
        if (!cca3 || !/^[A-Z]{3}$/.test(cca3)) return "";
        const meta = await getCountry(cca3);
        const bundle = await fetchCountryBundle(cca3, allMetricIds(), MIN_DATA_YEAR, currentDataYear());
        if (!meta) return "";
        return buildAssistantPrimaryDataBlock(meta, bundle);
      })(),
      buildAssistantRankingPayload(message, formatAssistantMetricValue),
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

    const rankingSection = rankingPayload?.plainBlock ?? "";
    const rankingMarkdown = rankingPayload?.markdownTable ?? "";
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
    const dashboardForPrompt = omitDuplicateDashboard ? "" : dashboardBlock;

    const hasAuthoritativePayload =
      Boolean(dashboardBlock) || Boolean(rankingSection) || Boolean(comparisonBlock);
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
        webContext = await tavilySearch(webQuery, 12, {
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
            12,
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
          const wide = await tavilySearch(`${message.replace(/\s+/g, " ").trim()} ${y}`, 10, {
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
        const strictStart = statsSupplementWebOnly ? utcDateDaysAgo(150) : utcDateDaysAgo(42);
        webContext = await tavilySearch(webQuery, statsSupplementWebOnly ? 8 : 10, {
          searchDepth: "advanced",
          includeAnswer: "advanced",
          topic: statsSupplementWebOnly ? "general" : "news",
          timeRange: statsSupplementWebOnly ? "month" : "week",
          startDate: strictStart,
          endDate: today,
          preferNewestSourcesFirst: true,
        });
        if (!webContext.trim()) {
          webContext = await tavilySearch(webQuery, statsSupplementWebOnly ? 8 : 10, {
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

    const voiceRules = `VOICE (mandatory):
- Never mention prompt machinery: no "web context", "primary platform data", "the block", "Tavily", "payload", or "since/as/because … is empty".
- Weave numbers into normal sentences; do not narrate how you obtained them.
- No "Sources:" footer—the UI shows lineage.
- When web excerpts include dates or “latest” reporting, prefer that timeline over undated training knowledge for current events and policy.`;

    const rankingTableRendered = Boolean(rankingMarkdown);

    const systemStatistics = `You are the Analytics Assistant for the Country Analytics Platform. Write like a concise senior analyst.

${voiceRules}

ACCURACY (internal):
- Country statistics, comparison statistics, and global ranking sections are authoritative for figures and rank order. Use them exactly; do not substitute memorized league tables.
- If the user asks for numbers not present below, say what is missing briefly—no invented statistics.
- Web excerpts (if any) are for non-conflicting background only; never override platform figures.

When both a selected country and a ranking appear, use the ranking for list questions and the country section for country-specific follow-ups.${
      rankingTableRendered
        ? `

RANKING TABLE (mandatory): The app shows the user a markdown **table** with the full rank list before your message. Do **not** output another table and do **not** repeat the list in a long paragraph. At most **two short sentences** of interpretation, unless the user also asked a separate non-list question—then answer that part in prose without re-stating every rank.`
        : ""
    }`;

    const systemWebPrimary = `You are the Analytics Assistant for the Country Analytics Platform. The question is general (geography, news, institutions, culture—not a statistics exam).

${voiceRules}

ACCURACY (internal):
- Lead with web excerpts when they contain the answer; each bullet may include a published/updated date—prefer **newer** dated items when they conflict with older ones.
- Country statistics below are optional anchors—use for hard numbers when relevant, without contradicting fresh web facts for breaking events.
${
  needsVerifiedWeb && !webSearchThin
    ? "- For officeholders, heads of state/government, and similar: when Recent web excerpts **do** substantively answer, prefer them over training cutoff knowledge."
    : needsVerifiedWeb && webSearchThin
      ? "- Leadership or election angle, but live search returned little text: answer from general knowledge when helpful. For **who holds office now** or very recent transitions, state your answer may be stale and ask the user to verify on an official government site or major news outlet."
      : "- If excerpts are thin, answer helpfully from general knowledge without inventing precise recent headlines."
}`;

    const ephemeralFactBlock =
      needsVerifiedWeb && !webSearchThin
        ? `

EPHEMERAL FACTS (current power-holders, very recent elections):
- Real-world roles change; web excerpts in the user message override stale parametric knowledge when they name who holds office or cite dates.
- If excerpts substantively name who holds office, use them; otherwise suggest checking official government or major news sources (without refusing to help on historical or stable facts).`
        : needsVerifiedWeb && webSearchThin
          ? `

EPHEMERAL FACTS:
- Live search was sparse for this turn. Give a careful best-effort answer from general knowledge where appropriate, with explicit caveats for time-sensitive leadership facts.`
          : "";

    const systemOverview = `You are the Analytics Assistant for the Country Analytics Platform. The user wants a readable **country overview**.

${voiceRules}

ACCURACY (internal):
- When a country statistics section is present, **anchor** the overview with those figures (GDP, population, growth, inflation, etc.) in smooth prose—this is the quantitative spine.
- Use web excerpts (when present) for texture: institutions, recent policy themes, culture—not to replace those series numbers. Prefer excerpts with **recent published dates** when several disagree.
- If statistics are empty, rely on web + general knowledge and avoid precise economic figures.

Structure: short geographic/regional framing, then main body weaving stats and context, tight close. One coherent story.`;

    const systemCompare = `You are the Analytics Assistant for the Country Analytics Platform. The user is **comparing multiple countries** (two or more in the sections below).

${voiceRules}

ACCURACY (internal):
- Only the per-country statistics sections below may supply **numbers**. Contrast GDP, population, growth, inflation, unemployment, debt, life expectancy, literacy, etc. using those values only—**cover every country** that has a section, not only the first pair.
- When many countries are listed, a **compact table in markdown** (country × indicator) is allowed if it improves clarity; otherwise use tight theme-by-theme prose with explicit country names.
- If one country’s section is missing, say so plainly—do not fill from memory.
- Web excerpts (if any) add qualitative context only; they do not replace the series.

Structure: one tight opening, then either a scannable comparison (table or bullets per theme) across **all** countries. Highlight the largest cross-country deltas with the exact figures.`;

    const systemBase =
      intent === "general_web"
        ? systemWebPrimary
        : intent === "country_overview"
          ? systemOverview
          : intent === "country_compare"
            ? systemCompare
            : systemStatistics;
    const system = `${systemBase}${ephemeralFactBlock}`;

    const verifiedRetrievalNote =
      needsVerifiedWeb && webSearchThin && tavilyConfigured
        ? "\n\n[Retrieval: live search returned no substantive excerpts. Answer helpfully using general knowledge where appropriate; for current officeholders or very recent elections, add a short caveat that the user should verify on official or major news sources.]\n"
        : "";
    const noTavilyVerifiedNote =
      needsVerifiedWeb && !tavilyConfigured
        ? "\n\n[Server: live web search is not configured on this deployment. Answer from general knowledge where you can; for who holds office now or very recent political events, clearly caveat uncertainty and suggest official government or major news sources.]\n"
        : "";

    const user = `User question:
${message}

Country statistics — selected dashboard country (may be empty):
${dashboardForPrompt || ""}

Country statistics — comparison (may be empty):
${comparisonBlock || ""}

Global ranking — top/bottom N (may be empty):
${rankingSection || ""}

Recent web excerpts — live search, biased to recent weeks (see retrieval window line when present; may be empty):
${webContext || ""}${verifiedRetrievalNote}${noTavilyVerifiedNote}`;

    let assistantLlmText: string | null = null;
    if (process.env.GROQ_API_KEY) {
      try {
        const { text, model, primaryFailed } = await groqChatWithFallbackForUseCase(
          "assistant",
          system,
          user,
          {
            temperature: needsVerifiedWeb && !webSearchThin ? 0.2 : groqTemperatureForIntent(intent),
            analyticsRecencyHint: needsVerifiedWeb && !webSearchThin,
          }
        );
        attribution.push(
          primaryFailed
            ? `LLM: Groq — Assistant stack (${model}, fallback after primary error/rate limit)`
            : `LLM: Groq — Assistant stack (${model})`
        );
        assistantLlmText = text.trim();
      } catch (groqErr) {
        const brief = groqErr instanceof Error ? groqErr.message : String(groqErr);
        attribution.push(`LLM: Groq exhausted (${brief.slice(0, 220)}${brief.length > 220 ? "…" : ""})`);
        if (tavilyConfigured) {
          const { text, hasSynthesis } = await tavilyAssistantFallbackReply(message);
          attribution.push(
            hasSynthesis
              ? "Fallback: Tavily answer synthesis (all Groq models failed or rate-limited)"
              : "Fallback: Tavily retrieval only (all Groq models failed; weak synthesis)"
          );
          assistantLlmText = text.trim();
        }
      }
    }

    if (assistantLlmText !== null) {
      const reply = rankingMarkdown
        ? `${rankingMarkdown.trim()}\n\n${assistantLlmText}`.trim()
        : assistantLlmText;
      return res.json({ reply, attribution });
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

    res.json({ reply: fallback, attribution });
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

    let web = "";
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
      const blocks = await Promise.all(
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
      );
      const webParts: string[] = [];
      for (let i = 0; i < queries.length; i++) {
        const b = blocks[i]?.trim();
        if (b) webParts.push(`### ${queries[i]!.label}\n${b}`);
      }
      web = webParts.join("\n\n");
      if (!web.trim()) {
        web = await tavilySearch(
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
      if (web) attribution.push("Web context: Tavily (multi-topic industry retrieval + fallback if needed)");
    }

    const porterNarrativeRules = `
NARRATIVE & SOURCE INTEGRATION (mandatory):
- Synthesize three inputs: (A) SOURCE A — DATA DIGEST (platform / WDI-backed indicators), (B) SOURCE B — web excerpts, (C) disciplined analyst inference. Each comprehensive \`body\` must read as one coherent mini-brief, not bullet pasting.
- Every comprehensive section listed below must contain **EXACTLY three prose paragraphs**, separated by a **single blank line** (one \\n\\n between paragraphs). Do not use markdown headings inside \`body\`.
- Paragraph 1: anchor in (A) for that section’s theme—cite concrete metrics with years where the digest provides them; relate them to the stated industry sector.
- Paragraph 2: prioritize the most relevant, concrete themes from (B) for that force (competition, regulation, supply chain, substitutes, etc.). If (B) is thin for that angle, say so briefly once and infer cautiously from (A) + sector structure—never invent quoted news or statistics not in (A) or (B).
- Paragraph 3: business and strategy implications **specific to that Porter force only** (e.g. Threat of new entry ≠ Rivalry—do not duplicate the same closing across sections).
- Never reuse the same opening sentence across two comprehensive sections. Vary vocabulary and storyline per force.
- Quantitative claims must come only from (A) or dated figures explicitly present in (B); round sensibly in prose.`;

    const jsonSchemaHint = `Return ONLY a JSON object (no markdown) with exactly this structure:
{
  "forces": [
    {"number":1,"title":"Threat of New Entry","accent":"threat_new_entry","bullets":["5-6 analyst bullets"]},
    {"number":2,"title":"Supplier Power","accent":"supplier_power","bullets":["5-6"]},
    {"number":3,"title":"Buyer Power","accent":"buyer_power","bullets":["5-6"]},
    {"number":4,"title":"Threat of Substitution","accent":"threat_substitutes","bullets":["5-6"]},
    {"number":5,"title":"Competitive Rivalry","accent":"rivalry","bullets":["5-6"]}
  ],
  "comprehensiveSections": [
    {"title":"Executive Summary","body":"EXACTLY three paragraphs (blank line between each). (1) Country + industry framing with key DATA DIGEST metrics and years. (2) Latest competitive and market themes from WEB CONTEXT. (3) Integrated read across the five forces and what leadership should monitor next."},
    {"title":"1. Threat of new entrants","body":"EXACTLY three paragraphs: (1) digest-grounded entry economics and macro context, (2) WEB CONTEXT on regulation, investment, disruption, or policy, (3) implications for threat of entry in this industry."},
    {"title":"2. Bargaining power of suppliers","body":"EXACTLY three paragraphs: (1) digest-relevant input cost and macro signals, (2) WEB CONTEXT on supply chain, commodities, or supplier concentration, (3) implications for supplier power."},
    {"title":"3. Bargaining power of buyers","body":"EXACTLY three paragraphs: (1) digest-grounded demand and income or labour signals, (2) WEB CONTEXT on channels, pricing power, or consumer behaviour, (3) implications for buyer power."},
    {"title":"4. Threat of substitutes","body":"EXACTLY three paragraphs: (1) digest context where relevant to substitution (income, trade, tech skills proxies), (2) WEB CONTEXT on alternatives, innovation, or consumer shifts, (3) implications for substitute threat."},
    {"title":"5. Competitive rivalry","body":"EXACTLY three paragraphs: (1) digest-grounded growth and macro rivalry drivers, (2) WEB CONTEXT on competitors, pricing wars, or market share dynamics, (3) implications for intensity of rivalry."}
  ],
  "newMarketAnalysis": ["4-6 bullets for market entry opportunities"],
  "keyTakeaways": ["4-6 bullets summarizing all five forces"],
  "recommendations": ["4-6 actionable bullets"]
}
Ground numbers in SOURCE A when available. Be specific to the country and industry sector.`;

    const prompt = `Country: ${meta?.name ?? cca3} (${cca3}). Industry/Sector: ${industrySector}. Year context: ${year}.
${porterNarrativeRules}

${jsonSchemaHint}

SOURCE A — Platform indicators (DATA DIGEST):
${digest}

SOURCE B — Web retrieval (Tavily; may be empty if key missing or no results):
${web || "(none — rely on Source A and careful structural inference; avoid fabricated news)"}`;

    if (!process.env.GROQ_API_KEY) {
      attribution.push("LLM: disabled — data-only template (set GROQ_API_KEY for sector narrative)");
      return res.json({ analysis: fallback, attribution });
    }
    try {
      const { text, model, primaryFailed } = await groqChatWithFallbackForUseCase(
        "porter",
        "You are a competitive strategy analyst. Output strictly valid JSON only. Prose must be coherent, non-repetitive, and weave platform data (Source A) with web evidence (Source B) when present. Each comprehensive section is exactly three paragraphs as specified—no bullet lists inside comprehensive bodies.",
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
