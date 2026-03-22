import type { SeriesPoint } from "./worldBank.js";
import type { CountrySummary } from "./restCountries.js";
import type { WbCountryProfile } from "./wbCountryProfile.js";

export type PestelDimension = {
  letter: "P" | "E" | "S" | "T" | "E" | "L";
  label: string;
  bullets: string[];
};

export type PestelSwot = {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
};

export type ComprehensiveSection = { title: string; body: string };

export type StrategicSection = { title: string; paragraphs: string[] };

export type PestelAnalysis = {
  pestelDimensions: PestelDimension[];
  swot: PestelSwot;
  comprehensiveSections: ComprehensiveSection[];
  strategicBusiness: StrategicSection[];
  newMarketAnalysis: string[];
  keyTakeaways: string[];
  recommendations: string[];
};

const DIMENSION_TEMPLATE: { letter: PestelDimension["letter"]; label: string }[] = [
  { letter: "P", label: "POLITICAL" },
  { letter: "E", label: "ECONOMIC" },
  { letter: "S", label: "SOCIOCULTURAL" },
  { letter: "T", label: "TECHNOLOGICAL" },
  { letter: "E", label: "ENVIRONMENTAL" },
  { letter: "L", label: "LEGAL" },
];

function strArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((i): i is string => typeof i === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function latest(bundle: Record<string, SeriesPoint[]>, id: string): { year: number; value: number } | null {
  const pts = bundle[id] ?? [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const v = pts[i]?.value;
    if (v !== null && v !== undefined && Number.isFinite(v)) return { year: pts[i].year, value: v };
  }
  return null;
}

function fmtUsd(v: number): string {
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)} trillion`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)} Bn`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)} Mn`;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtPop(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Bn`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} Mn`;
  return `${Math.round(v).toLocaleString("en-US")}`;
}

function pct(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`;
}

function canonicalDimensionLabel(raw: string): string | null {
  const u = raw.toUpperCase().replace(/[^A-Z]/g, "");
  if (u.includes("POLIT") || u === "P") return "POLITICAL";
  if (u.includes("ECON") || u === "Economic".toUpperCase()) return "ECONOMIC";
  if (u.includes("SOCIO") || u === "SOCIAL" || u.includes("CULTUR")) return "SOCIOCULTURAL";
  if (u.includes("TECH")) return "TECHNOLOGICAL";
  if (u.includes("ENVIRON") || u === "ENVIRONMENTAL") return "ENVIRONMENTAL";
  if (u.includes("LEGAL") || u.includes("LAW")) return "LEGAL";
  return null;
}

function normalizeLabelKey(label: string): string {
  const c = canonicalDimensionLabel(label);
  return c ?? label.toUpperCase().replace(/\s+/g, " ").trim();
}

export function parsePestelAnalysisFromLlm(text: string): Partial<PestelAnalysis> | null {
  let t = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(t);
  if (fence) t = fence[1].trim();
  try {
    const o = JSON.parse(t) as unknown;
    if (!o || typeof o !== "object") return null;
    return extractPartial(o as Record<string, unknown>);
  } catch {
    return null;
  }
}

function extractPartial(r: Record<string, unknown>): Partial<PestelAnalysis> {
  const rawDims = (r.pestelDimensions ?? r.pestel ?? r.dimensions) as unknown;
  const pestelDimensions: PestelDimension[] = [];
  if (Array.isArray(rawDims)) {
    for (const item of rawDims) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const letter = typeof o.letter === "string" && o.letter.length === 1 ? (o.letter.toUpperCase() as PestelDimension["letter"]) : "P";
      const label = typeof o.label === "string" ? o.label.toUpperCase() : "POLITICAL";
      const bullets = strArray(o.bullets);
      if (bullets.length) pestelDimensions.push({ letter, label, bullets });
    }
  }

  const swotRaw = r.swot as Record<string, unknown> | undefined;
  const swot: PestelSwot | undefined = swotRaw
    ? {
        strengths: strArray(swotRaw.strengths),
        weaknesses: strArray(swotRaw.weaknesses),
        opportunities: strArray(swotRaw.opportunities),
        threats: strArray(swotRaw.threats),
      }
    : undefined;

  const compRaw = r.comprehensiveSections ?? r.comprehensive;
  const comprehensiveSections: ComprehensiveSection[] = [];
  if (Array.isArray(compRaw)) {
    for (const item of compRaw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const title = typeof o.title === "string" ? o.title : "Section";
      let body = typeof o.body === "string" ? o.body : "";
      const paras = strArray(o.paragraphs);
      if (paras.length) body = paras.join("\n\n");
      if (body.trim()) comprehensiveSections.push({ title, body: body.trim() });
    }
  }

  const stratRaw = r.strategicBusiness ?? r.strategicImplications ?? r.pestelSwotNarrative;
  const strategicBusiness: StrategicSection[] = [];
  if (Array.isArray(stratRaw)) {
    for (const item of stratRaw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const title = typeof o.title === "string" ? o.title : "Section";
      let paragraphs = strArray(o.paragraphs);
      if (!paragraphs.length && typeof o.body === "string") {
        paragraphs = o.body
          .split(/\n\n+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (paragraphs.length) strategicBusiness.push({ title, paragraphs });
    }
  }

  return {
    pestelDimensions: pestelDimensions.length ? pestelDimensions : undefined,
    swot,
    comprehensiveSections: comprehensiveSections.length ? comprehensiveSections : undefined,
    strategicBusiness: strategicBusiness.length ? strategicBusiness : undefined,
    newMarketAnalysis: strArray(r.newMarketAnalysis).length ? strArray(r.newMarketAnalysis) : undefined,
    keyTakeaways: strArray(r.keyTakeaways).length ? strArray(r.keyTakeaways) : undefined,
    recommendations: strArray(r.recommendations).length ? strArray(r.recommendations) : undefined,
  };
}

function mapParsedDimensions(parsed: PestelDimension[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const d of parsed) {
    const key = normalizeLabelKey(d.label);
    const canon = canonicalDimensionLabel(d.label) ?? key;
    if (d.bullets.length) m.set(canon, d.bullets);
  }
  return m;
}

function nonemptyLines(a: string[] | undefined, min: number): string[] | null {
  const x = a?.filter(Boolean) ?? [];
  return x.length >= min ? x : null;
}

export function mergePestelAnalysis(partial: Partial<PestelAnalysis>, fallback: PestelAnalysis): PestelAnalysis {
  const byLabel = partial.pestelDimensions ? mapParsedDimensions(partial.pestelDimensions) : new Map();

  const pestelDimensions: PestelDimension[] = DIMENSION_TEMPLATE.map((t, i) => {
    const fromLlm = byLabel.get(t.label);
    const fb = fallback.pestelDimensions[i];
    const merged =
      fromLlm && fromLlm.filter(Boolean).length >= 3 ? fromLlm : fb?.bullets?.length ? fb.bullets : fromLlm ?? fb?.bullets ?? [];
    return { letter: t.letter, label: t.label, bullets: merged.length ? merged : ["—"] };
  });

  const swot: PestelSwot = {
    strengths: nonemptyLines(partial.swot?.strengths, 3) ?? fallback.swot.strengths,
    weaknesses: nonemptyLines(partial.swot?.weaknesses, 3) ?? fallback.swot.weaknesses,
    opportunities: nonemptyLines(partial.swot?.opportunities, 3) ?? fallback.swot.opportunities,
    threats: nonemptyLines(partial.swot?.threats, 3) ?? fallback.swot.threats,
  };

  const comp = partial.comprehensiveSections?.filter((s) => s.body.trim()) ?? [];
  const comprehensiveSections = comp.length >= 2 ? comp : fallback.comprehensiveSections;

  const strat = partial.strategicBusiness?.filter((s) => s.paragraphs.some(Boolean)) ?? [];
  const strategicBusiness = strat.length >= 2 ? strat : fallback.strategicBusiness;

  const newMarketAnalysis = nonemptyLines(partial.newMarketAnalysis, 3) ?? fallback.newMarketAnalysis;
  const keyTakeaways = nonemptyLines(partial.keyTakeaways, 3) ?? fallback.keyTakeaways;
  const recommendations = nonemptyLines(partial.recommendations, 2) ?? fallback.recommendations;

  return {
    pestelDimensions,
    swot,
    comprehensiveSections,
    strategicBusiness,
    newMarketAnalysis,
    keyTakeaways,
    recommendations,
  };
}

export function buildDataOnlyPestel(
  countryName: string,
  cca3: string,
  digest: string,
  bundle: Record<string, SeriesPoint[]>,
  meta: CountrySummary | undefined,
  profile: WbCountryProfile | null
): PestelAnalysis {
  const region = meta?.region ?? profile?.region ?? "—";
  const sub = meta?.subregion ?? "—";
  const income = profile?.incomeLevel ?? "—";
  const gov = meta?.government ?? "Government type not listed in REST Countries dataset.";
  const pop = latest(bundle, "population");
  const gdp = latest(bundle, "gdp");
  const gdpPc = latest(bundle, "gdp_per_capita");
  const growth = latest(bundle, "gdp_growth");
  const debt = latest(bundle, "gov_debt_pct_gdp");
  const infl = latest(bundle, "inflation");
  const life = latest(bundle, "life_expectancy");
  const y014 = latest(bundle, "pop_age_0_14");
  const y65 = latest(bundle, "pop_age_65_plus");
  const lit = latest(bundle, "literacy_adult");
  const unemp = latest(bundle, "unemployment_ilo");
  const area = meta?.area;

  const econLines: string[] = [];
  if (gdp) econLines.push(`Nominal GDP (${gdp.year}): ${fmtUsd(gdp.value)}.`);
  if (gdpPc) econLines.push(`GDP per capita (${gdpPc.year}): ${fmtUsd(gdpPc.value)}.`);
  if (growth) econLines.push(`GDP growth (${growth.year}): ${pct(growth.value)}.`);
  if (pop) econLines.push(`Population (${pop.year}): ${fmtPop(pop.value)}.`);
  if (debt) econLines.push(`Central government debt (${debt.year}): ${pct(debt.value)} of GDP.`);
  if (infl) econLines.push(`Inflation, consumer prices (${infl.year}): ${pct(infl.value)}.`);
  if (unemp) econLines.push(`Unemployment (${unemp.year}): ${pct(unemp.value)} of labour force.`);

  const socialLines: string[] = [];
  if (y014) socialLines.push(`Population ages 0–14 (${y014.year}): ${pct(y014.value)} of total.`);
  if (y65) socialLines.push(`Population ages 65+ (${y65.year}): ${pct(y65.value)} of total.`);
  if (life) socialLines.push(`Life expectancy at birth (${life.year}): ${life.value.toFixed(1)} years.`);
  if (lit) socialLines.push(`Adult literacy (${lit.year}): ${pct(lit.value)} where reported.`);

  const execBody = [
    `${countryName} (${cca3}) — quantitative snapshot from World Bank WDI (where available) and REST Countries metadata.`,
    econLines.slice(0, 4).join(" "),
    socialLines.slice(0, 2).join(" "),
    `World Bank region: ${region}; income group: ${income}.`,
    `Set GROQ_API_KEY (and optionally TAVILY_API_KEY) for full narrative PESTEL, SWOT, and recommendations.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const pestelDimensions: PestelDimension[] = [
    {
      letter: "P",
      label: "POLITICAL",
      bullets: [
        `${gov}`,
        `Geopolitical framing: ${region}${sub !== "—" ? ` · ${sub}` : ""} — validate current leadership and policy priorities with primary sources.`,
        `Cross-check corruption, bureaucracy, and regulatory stability with Transparency International, Doing Business successors, and local counsel.`,
        `Trade and alliance context (e.g. ASEAN, RCEP, bilateral ties) should be confirmed for your sector and time horizon.`,
        `Data layer: REST Countries + World Bank country metadata; supplement with news and official gazettes.`,
      ],
    },
    {
      letter: "E",
      label: "ECONOMIC",
      bullets:
        econLines.length >= 5
          ? econLines.slice(0, 5)
          : [
              ...econLines,
              `Income classification (WB): ${income}.`,
              "Open the Country Dashboard for charts, YoY changes, and peer comparison.",
            ].slice(0, 5),
    },
    {
      letter: "S",
      label: "SOCIOCULTURAL",
      bullets:
        socialLines.length >= 4
          ? socialLines.slice(0, 5)
          : [
              ...socialLines,
              "Urbanization, inequality, and middle-class dynamics require sector-specific consumer research.",
              "Education and skills data in WDI support workforce planning — pair with local hiring market intelligence.",
            ].slice(0, 5),
    },
    {
      letter: "T",
      label: "TECHNOLOGICAL",
      bullets: [
        "Digital adoption, fintech, and e-commerce penetration vary sharply by island/region — use operator and regulator filings where possible.",
        "National digital infrastructure and literacy programs (where reported in WDI) are a baseline; pilot markets before national rollouts.",
        "Cybersecurity, data residency, and cloud policy should be validated with ICT ministry guidance.",
        "Startup ecosystem signals are qualitative — triangulate with investment databases and local accelerators.",
      ],
    },
    {
      letter: "E",
      label: "ENVIRONMENTAL",
      bullets: [
        "Climate exposure (coastal, flood, drought) is material for supply chains — use IPCC national chapters and local hazard maps.",
        `Land and maritime area (REST Countries): ${area != null ? `${(area / 1e6).toFixed(2)} Mn km² total land` : "—"}; EEZ and offshore claims need hydrographic/regulatory confirmation.`,
        "Energy mix and emissions commitments: verify with UNFCCC submissions and national energy balances.",
        "Natural-resource sectors (forestry, mining, agriculture) carry permitting and ESG scrutiny — align with host-country ESG rules.",
      ],
    },
    {
      letter: "L",
      label: "LEGAL",
      bullets: [
        "Civil vs common-law traditions and sectoral codes affect contracts — engage local counsel for entity setup, licensing, and labor rules.",
        "IP, competition, and consumer-protection enforcement differ by sector; check registrar and competition authority decisions.",
        "Labor law, tax treaties, and transfer-pricing posture should be modeled before operating scale.",
        "Sanctions, export controls, and FDI screening are dynamic — re-check at deal time.",
      ],
    },
  ];

  const swot: PestelSwot = {
    strengths: [
      pop ? `Large domestic market on a ${fmtPop(pop.value)}-person baseline (${pop.year}).` : "Demographic scale depends on segment — validate TAM.",
      `Regional position: ${region} — map logistics corridors and trade agreements relevant to your product.`,
      gdp ? `Economic mass: nominal GDP ${fmtUsd(gdp.value)} (${gdp.year}).` : "Use dashboard series to size GDP when available.",
      "Natural-resource or services endowments are country-specific — tie to your value chain.",
    ],
    weaknesses: [
      "Macro WDI series are not firm-level: governance, infrastructure, and execution gaps need local diligence.",
      "Data gaps and lags are common; do not treat a single year as structural truth.",
      "Without LLM narrative, SWOT bullets are intentionally generic — enable Groq for tailored SWOT.",
    ],
    opportunities: [
      income !== "—" ? `Income group ${income} frames consumption potential — segment by city tier.` : "Segment by city tier and channel.",
      "Manufacturing, tourism, digital services, and green-tech angles depend on sector fit — stress-test with local partners.",
    ],
    threats: [
      infl && infl.value > 5 ? `Elevated inflation (${pct(infl.value)} in ${infl.year}) can compress margins.` : "Macro volatility and FX risk require hedging and pricing discipline.",
      "Climate, geopolitical, and regulatory shocks are outside this digest — monitor scenario planning.",
    ],
  };

  const comprehensiveSections: ComprehensiveSection[] = [
    { title: "Executive summary", body: execBody },
    {
      title: "Political factors",
      body: pestelDimensions[0].bullets.join("\n\n"),
    },
    {
      title: "Economic factors",
      body: pestelDimensions[1].bullets.join("\n\n"),
    },
    {
      title: "Sociocultural factors",
      body: pestelDimensions[2].bullets.join("\n\n"),
    },
    {
      title: "Technological factors",
      body: pestelDimensions[3].bullets.join("\n\n"),
    },
    {
      title: "Environmental factors",
      body: pestelDimensions[4].bullets.join("\n\n"),
    },
    {
      title: "Legal factors",
      body: pestelDimensions[5].bullets.join("\n\n"),
    },
  ];

  const strategicBusiness: StrategicSection[] = [
    {
      title: "Strengths",
      paragraphs: [
        swot.strengths.slice(0, 2).join(" "),
        "Corroborate with customer interviews, distributor feedback, and competitor benchmarking before committing capital.",
      ],
    },
    {
      title: "Weaknesses",
      paragraphs: [
        swot.weaknesses.slice(0, 2).join(" "),
        "Mitigate via joint ventures, phased entry, and compliance investments tied to measurable KPIs.",
      ],
    },
    {
      title: "Opportunities",
      paragraphs: [
        swot.opportunities.join(" "),
        "Prioritize segments where regulatory tailwinds and distribution reach align with your capabilities.",
      ],
    },
    {
      title: "Threats",
      paragraphs: [
        swot.threats.join(" "),
        "Build contingency plans for FX, policy reversals, and supply-chain disruption.",
      ],
    },
  ];

  return {
    pestelDimensions,
    swot,
    comprehensiveSections,
    strategicBusiness,
    newMarketAnalysis: [
      "Screen sectors against WDI health, education, and labour series before detailed due diligence.",
      "Map trade agreements (e.g. regional blocs) to tariff and rules-of-origin advantages.",
      "Digital and sustainability positioning should align with stated national development plans.",
    ],
    keyTakeaways: [
      "Macro indicators are a starting point — segment-level economics and regulation drive investability.",
      "Regional trade blocs and logistics corridors can expand TAM if product-market fit is proven locally.",
      "Governance, infrastructure, and execution gaps often matter more than headline GDP growth.",
      "Environmental and climate exposure increasingly shape CAPEX, insurance, and supply-chain design.",
      "Coordinate tax, labor, licensing, and IP workstreams early to avoid late-stage surprises.",
    ],
    recommendations: [
      "Enable GROQ_API_KEY for analyst-style narrative, SWOT depth, and cited web context (optional TAVILY_API_KEY).",
      "Pair this scan with the Country Dashboard charts and Global Analytics for peer context.",
    ],
  };
}
