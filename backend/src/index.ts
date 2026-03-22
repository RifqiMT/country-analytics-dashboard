import "dotenv/config";
import { createHash } from "node:crypto";
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
import { groqChat, tavilySearch } from "./llm.js";
import { clearAllCache, getCache, setCache } from "./cache.js";
import { fetchWbCountryProfile } from "./wbCountryProfile.js";
import { buildDashboardComparison } from "./dashboardComparison.js";
import { buildGlobalTable, type TableCategory } from "./globalTable.js";
import {
  buildDataOnlyPestel,
  mergePestelAnalysis,
  parsePestelAnalysisFromLlm,
} from "./pestelAnalysis.js";
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
  res.json({ ok: true });
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

app.post("/api/assistant/chat", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    const cca3 = req.body?.countryCode ? String(req.body.countryCode).toUpperCase() : "";
    if (!message) return res.status(400).json({ error: "message required" });

    const attribution: string[] = ["Dashboard: World Bank WDI + REST Countries (where applicable)"];

    let dashboardBlock = "";
    if (cca3 && /^[A-Z]{3}$/.test(cca3)) {
      const meta = await getCountry(cca3);
      const bundle = await fetchCountryBundle(cca3, allMetricIds(), MIN_DATA_YEAR, currentDataYear());
      const lines: string[] = [];
      if (meta) lines.push(`Country: ${meta.name} (${meta.cca3}), region: ${meta.region}`);
      for (const id of [
        "gdp",
        "gdp_per_capita",
        "gdp_growth",
        "population",
        "gov_debt_pct_gdp",
        "inflation",
        "life_expectancy",
        "unemployment_ilo",
      ]) {
        const pts = bundle[id] ?? [];
        const lv = latestValue(pts);
        const yoy = yoyChange(pts);
        if (lv) {
          lines.push(
            `${id}: ${lv.value} (year ${lv.year})` + (yoy !== null ? `; YoY ~${yoy.toFixed(2)}%` : "")
          );
        }
      }
      dashboardBlock = lines.join("\n");
    }

    let webContext = "";
    if (process.env.TAVILY_API_KEY) {
      webContext = await tavilySearch(`${message} ${cca3 || "global economy"}`, 5);
      if (webContext) attribution.push("Web: Tavily search (supplementary context)");
    }

    const system = `You are the Analytics Assistant for the Country Analytics Platform. 
Use the DASHBOARD DATA block as ground truth for supported metrics. 
If web context is provided, use it for recent events and cite it qualitatively; do not contradict dashboard series.
Always end with a short "Sources" line listing: dashboard metrics, any web titles/URLs you relied on, and the model name.`;

    const user = `User question:\n${message}\n\nDASHBOARD DATA:\n${dashboardBlock || "(no country selected — answer generally or ask to pick a country)"}\n\nWEB CONTEXT (may be empty):\n${webContext || "(none)"}`;

    if (process.env.GROQ_API_KEY) {
      const { text, model } = await groqChat(system, user);
      attribution.push(`LLM: Groq (${model})`);
      return res.json({
        reply: text,
        attribution,
      });
    }

    const fallback =
      dashboardBlock
        ? `Here is what the dashboard data shows for the selected country:\n\n${dashboardBlock}\n\n` +
          `Configure GROQ_API_KEY (and optionally TAVILY_API_KEY) for full natural-language synthesis.`
        : `Select a country on the dashboard for metric-grounded answers, or set GROQ_API_KEY for open Q&A.`;

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
    const digest = buildDataDigest(meta?.name ?? cca3, bundle);
    const attribution: string[] = ["PESTEL structured on World Bank WDI-backed dashboard series"];
    const fallback = buildDataOnlyPestel(meta?.name ?? cca3, cca3, digest, bundle, meta, profile);

    let web = "";
    if (process.env.TAVILY_API_KEY) {
      web = await tavilySearch(`${meta?.name ?? cca3} political economic social technology environment legal ${year}`, 6);
      if (web) attribution.push("Web context: Tavily");
    }

    const jsonSchemaHint = `Return ONLY a JSON object (no markdown) with exactly this structure:
{
  "pestelDimensions": [
    {"letter":"P","label":"POLITICAL","bullets":["five concise bullets"]},
    {"letter":"E","label":"ECONOMIC","bullets":["five"]},
    {"letter":"S","label":"SOCIOCULTURAL","bullets":["five"]},
    {"letter":"T","label":"TECHNOLOGICAL","bullets":["five"]},
    {"letter":"E","label":"ENVIRONMENTAL","bullets":["five"]},
    {"letter":"L","label":"LEGAL","bullets":["five"]}
  ],
  "swot": {
    "strengths": ["6-8 bullets"],
    "weaknesses": ["6-8 bullets"],
    "opportunities": ["6-8 bullets"],
    "threats": ["6-8 bullets"]
  },
  "comprehensiveSections": [
    {"title":"Executive summary","body":"multiple paragraphs separated by blank lines"},
    {"title":"Political factors","body":"..."},
    {"title":"Economic factors","body":"..."},
    {"title":"Sociocultural factors","body":"..."},
    {"title":"Technological factors","body":"..."},
    {"title":"Environmental factors","body":"..."},
    {"title":"Legal factors","body":"..."}
  ],
  "strategicBusiness": [
    {"title":"Strengths","paragraphs":["paragraph 1","paragraph 2"]},
    {"title":"Weaknesses","paragraphs":["",""]},
    {"title":"Opportunities","paragraphs":["",""]},
    {"title":"Threats","paragraphs":["",""]}
  ],
  "newMarketAnalysis": ["4-6 bullets for market entry"],
  "keyTakeaways": ["4-6 bullets"],
  "recommendations": ["3-5 actionable bullets"]
}
Ground numbers in the DATA DIGEST when present; flag missing data instead of inventing.`;

    const prompt = `Country: ${meta?.name ?? cca3} (${cca3}). Context year for search: ${year}.

${jsonSchemaHint}

DATA DIGEST:
${digest}

WEB CONTEXT:
${web || "(none)"}`;

    if (!process.env.GROQ_API_KEY) {
      attribution.push("LLM: disabled — structured data-only template (set GROQ_API_KEY for AI narrative)");
      return res.json({ analysis: fallback, attribution });
    }
    const { text, model } = await groqChat(
      "You are a senior strategy consultant. Output strictly valid JSON matching the user schema. Be specific and analyst-grade.",
      prompt,
      { jsonObject: true }
    );
    attribution.push(`LLM: Groq (${model})`);
    const partial = parsePestelAnalysisFromLlm(text);
    const analysis = partial ? mergePestelAnalysis(partial, fallback) : fallback;
    res.json({ analysis, attribution });
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
    if (process.env.TAVILY_API_KEY) {
      web = await tavilySearch(
        `${meta?.name ?? cca3} ${industrySector} Porter five forces industry competition ${year}`,
        6
      );
      if (web) attribution.push("Web context: Tavily");
    }

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
    {"title":"Executive Summary","body":"2-4 paragraphs overview of industry and forces"},
    {"title":"1. Threat of new entrants","body":"detailed prose"},
    {"title":"2. Bargaining power of suppliers","body":"..."},
    {"title":"3. Bargaining power of buyers","body":"..."},
    {"title":"4. Threat of substitutes","body":"..."},
    {"title":"5. Competitive rivalry","body":"..."}
  ],
  "newMarketAnalysis": ["4-6 bullets for market entry opportunities"],
  "keyTakeaways": ["4-6 bullets summarizing all five forces"],
  "recommendations": ["4-6 actionable bullets"]
}
Ground numbers in DATA DIGEST when available. Be specific to the country and industry sector.`;

    const prompt = `Country: ${meta?.name ?? cca3} (${cca3}). Industry/Sector: ${industrySector}. Year context: ${year}.

${jsonSchemaHint}

DATA DIGEST:
${digest}

WEB CONTEXT:
${web || "(none)"}`;

    if (!process.env.GROQ_API_KEY) {
      attribution.push("LLM: disabled — data-only template (set GROQ_API_KEY for sector narrative)");
      return res.json({ analysis: fallback, attribution });
    }
    const { text, model } = await groqChat(
      "You are a competitive strategy analyst. Output strictly valid JSON. Be sector-specific and analyst-grade.",
      prompt,
      { jsonObject: true }
    );
    attribution.push(`LLM: Groq (${model})`);
    const partial = parsePorterFromLlm(text);
    const analysis = partial ? mergePorterAnalysis(partial, fallback) : fallback;
    res.json({ analysis, attribution });
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
