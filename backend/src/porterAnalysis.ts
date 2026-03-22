import type { SeriesPoint } from "./worldBank.js";
import type { CountrySummary } from "./restCountries.js";
import type { WbCountryProfile } from "./wbCountryProfile.js";

export type PorterForce = {
  number: 1 | 2 | 3 | 4 | 5;
  title: string;
  bullets: string[];
  /** Accent color key: threat_new_entry | supplier_power | buyer_power | threat_substitutes | rivalry */
  accent: string;
};

export type PorterAnalysis = {
  forces: PorterForce[];
  comprehensiveSections: { title: string; body: string }[];
  newMarketAnalysis: string[];
  keyTakeaways: string[];
  recommendations: string[];
};

const FORCE_TEMPLATE: { number: 1 | 2 | 3 | 4 | 5; title: string; accent: string }[] = [
  { number: 1, title: "Threat of New Entry", accent: "threat_new_entry" },
  { number: 2, title: "Supplier Power", accent: "supplier_power" },
  { number: 3, title: "Buyer Power", accent: "buyer_power" },
  { number: 4, title: "Threat of Substitution", accent: "threat_substitutes" },
  { number: 5, title: "Competitive Rivalry", accent: "rivalry" },
];

const ACC_MAP: Record<string, string> = {
  threat_new_entry: "threat_new_entry",
  supplier_power: "supplier_power",
  buyer_power: "buyer_power",
  threat_substitutes: "threat_substitutes",
  rivalry: "rivalry",
};

const TITLE_MAP: Record<string, string> = {
  "threat of new entrants": "Threat of New Entry",
  "threat of new entry": "Threat of New Entry",
  "supplier power": "Supplier Power",
  "buyer power": "Buyer Power",
  "threat of substitutes": "Threat of Substitution",
  "threat of substitution": "Threat of Substitution",
  "competitive rivalry": "Competitive Rivalry",
};

const FIVE_PADS = [
  "Stress-test each force against regulator circulars, trade data, and channel checks before committing capital.",
  "Use the Country Dashboard indicators to refresh macro anchors each quarter alongside sector news.",
  "Segment the ISIC division into sub-markets where rivalry and entry dynamics differ materially.",
] as const;

const GENERIC_BULLET =
  "Reconcile Porter conclusions with peer benchmarks, legal/licensing reality, and updated official statistics.";

function strArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((i): i is string => typeof i === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function bulletDedupeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

/** Exactly five distinct bullets: primary first, then fallback, then pads. */
export function ensureFivePorterBullets(primary: string[], fallback: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const tryPush = (raw: string): boolean => {
    const t = raw.trim();
    if (!t) return false;
    const k = bulletDedupeKey(t);
    if (k.length >= 12) {
      if (seen.has(k)) return false;
      seen.add(k);
    } else if (out.includes(t)) return false;
    out.push(t);
    return true;
  };

  for (const s of primary) tryPush(s);
  let fi = 0;
  while (out.length < 5 && fi < fallback.length) tryPush(fallback[fi++]!);
  let pi = 0;
  while (out.length < 5 && pi < 12) tryPush(FIVE_PADS[pi % FIVE_PADS.length]!);
  let guard = 0;
  while (out.length < 5 && guard++ < 20) tryPush(GENERIC_BULLET);
  return out.slice(0, 5);
}

function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\r/g, "").trim())
    .filter(Boolean);
}

/** Exactly three paragraphs for comprehensive `body`. */
export function ensureThreePorterParagraphs(primaryBody: string, fallbackBody: string): string {
  const primary = splitParagraphs(primaryBody);
  const fallback = splitParagraphs(fallbackBody);
  const out: string[] = [];
  let i = 0;
  while (out.length < 3 && i < primary.length) {
    const p = primary[i++]!;
    if (p && !out.includes(p)) out.push(p);
  }
  let j = 0;
  while (out.length < 3 && j < fallback.length) {
    const p = fallback[j++]!;
    if (p && !out.includes(p)) out.push(p);
  }
  while (out.length < 3) {
    out.push(
      "Validate strategic implications with updated indicator releases and sector-specific primary sources before board or investment decisions."
    );
  }
  return out.slice(0, 3).join("\n\n");
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

export function parsePorterFromLlm(text: string): Partial<PorterAnalysis> | null {
  let t = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(t);
  if (fence) t = fence[1].trim();
  try {
    const o = JSON.parse(t) as unknown;
    if (!o || typeof o !== "object") return null;
    const r = o as Record<string, unknown>;
    const forcesRaw = (r.forces ?? r.fiveForces ?? r.five_forces) as unknown;
    let forcesOrdered: PorterForce[] | undefined;
    if (Array.isArray(forcesRaw)) {
      const slotMap = new Map<number, PorterForce>();
      for (let i = 0; i < Math.min(forcesRaw.length, 5); i++) {
        const item = forcesRaw[i];
        if (!item || typeof item !== "object") continue;
        const it = item as Record<string, unknown>;
        const n = typeof it.number === "number" ? it.number : i + 1;
        const num = Math.min(5, Math.max(1, n)) as 1 | 2 | 3 | 4 | 5;
        const bullets = strArray(it.bullets ?? it.points ?? it.content);
        const title =
          typeof it.title === "string"
            ? TITLE_MAP[it.title.toLowerCase()] ?? it.title
            : FORCE_TEMPLATE[num - 1]!.title;
        const rawAcc = typeof it.accent === "string" ? it.accent : "";
        const accent = ACC_MAP[rawAcc] ? rawAcc : FORCE_TEMPLATE[num - 1]!.accent;
        slotMap.set(num, { number: num, title, bullets, accent });
      }
      forcesOrdered = FORCE_TEMPLATE.map((tm) => {
        const got = slotMap.get(tm.number);
        return got ?? { number: tm.number, title: tm.title, accent: tm.accent, bullets: [] };
      });
    }

    const compRaw = r.comprehensiveSections ?? r.comprehensive ?? r.executiveSections;
    const comprehensiveSections: { title: string; body: string }[] = [];
    if (Array.isArray(compRaw)) {
      for (const item of compRaw) {
        if (!item || typeof item !== "object") continue;
        const ob = item as Record<string, unknown>;
        const title = typeof ob.title === "string" ? ob.title : "Section";
        const body = typeof ob.body === "string" ? ob.body : "";
        if (body.trim()) comprehensiveSections.push({ title, body: body.trim() });
      }
    }

    return {
      forces: forcesOrdered,
      comprehensiveSections: comprehensiveSections.length ? comprehensiveSections : undefined,
      newMarketAnalysis: strArray(r.newMarketAnalysis).length ? strArray(r.newMarketAnalysis) : undefined,
      keyTakeaways: strArray(r.keyTakeaways).length ? strArray(r.keyTakeaways) : undefined,
      recommendations: strArray(r.recommendations).length ? strArray(r.recommendations) : undefined,
    };
  } catch {
    return null;
  }
}

function normalizeAccent(a: string, fb: string): string {
  return ACC_MAP[a] ? a : fb;
}

/** Strip internal source labels from client-visible Porter strings. */
function polishPorterProse(s: string): string {
  let t = s;
  const pairs: [RegExp, string][] = [
    [/\bSOURCE\s+A\b/gi, ""],
    [/\bSOURCE\s+B\b/gi, ""],
    [/\bSource\s+A\b/g, ""],
    [/\bSource\s+B\b/g, ""],
    [/\bDATA\s+DIGEST\b/gi, "official indicators"],
    [/\bWDI-backed\b/gi, "indicator-based"],
    [/\bData layer:\s*/gi, ""],
  ];
  for (const [re, rep] of pairs) t = t.replace(re, rep);
  return t
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,;:.!?])/g, "$1")
    .trim();
}

function polishForce(f: PorterForce): PorterForce {
  return {
    ...f,
    bullets: f.bullets.map(polishPorterProse),
  };
}

export function polishPorterAnalysisForClient(a: PorterAnalysis): PorterAnalysis {
  return {
    forces: a.forces.map(polishForce),
    comprehensiveSections: a.comprehensiveSections.map((s) => ({
      ...s,
      body: polishPorterProse(s.body),
    })),
    newMarketAnalysis: a.newMarketAnalysis.map(polishPorterProse),
    keyTakeaways: a.keyTakeaways.map(polishPorterProse),
    recommendations: a.recommendations.map(polishPorterProse),
  };
}

export function mergePorterAnalysis(partial: Partial<PorterAnalysis>, fallback: PorterAnalysis): PorterAnalysis {
  const forces: PorterForce[] = FORCE_TEMPLATE.map((tm, i) => {
    const pf = partial.forces?.[i];
    const fb = fallback.forces[i]!;
    const title = (pf?.title?.trim() || fb.title) as string;
    const accent = normalizeAccent(pf?.accent ?? "", fb.accent);
    const bullets = ensureFivePorterBullets(pf?.bullets ?? [], fb.bullets);
    return { number: tm.number, title, accent, bullets };
  });

  const comprehensiveSections = fallback.comprehensiveSections.map((fb, i) => {
    const pc = partial.comprehensiveSections?.[i];
    const body = ensureThreePorterParagraphs(pc?.body ?? "", fb.body);
    return { title: fb.title, body };
  });

  const newMarketAnalysis = ensureFivePorterBullets(
    partial.newMarketAnalysis ?? [],
    fallback.newMarketAnalysis
  );
  const keyTakeaways = ensureFivePorterBullets(partial.keyTakeaways ?? [], fallback.keyTakeaways);
  const recommendations = ensureFivePorterBullets(partial.recommendations ?? [], fallback.recommendations);

  return polishPorterAnalysisForClient({
    forces,
    comprehensiveSections,
    newMarketAnalysis,
    keyTakeaways,
    recommendations,
  });
}

export function buildDataOnlyPorter(
  countryName: string,
  cca3: string,
  industryLabel: string,
  digest: string,
  bundle: Record<string, SeriesPoint[]>,
  meta: CountrySummary | undefined,
  profile: WbCountryProfile | null
): PorterAnalysis {
  const region = meta?.region ?? profile?.region ?? "—";
  const income = profile?.incomeLevel ?? "—";
  const gdp = latest(bundle, "gdp");
  const pop = latest(bundle, "population");
  const growth = latest(bundle, "gdp_growth");
  const unemp = latest(bundle, "unemployment_ilo");

  const forces: PorterForce[] = [
    {
      number: 1,
      title: "Threat of New Entry",
      accent: "threat_new_entry",
      bullets: [
        `Barriers to entry in ${industryLabel} vary by capital intensity and regulation—confirm with sector licensing and investment promotion sources.`,
        income !== "—" ? `World Bank income classification (${income}) frames domestic market scale and typical entry economics.` : "Use GDP and population from the indicator digest to size the addressable market.",
        "Regulatory and licensing requirements differ by jurisdiction—triangulate with trade associations and ministry filings.",
        "Economies of scale and incumbent branding can deter entrants in concentrated sub-segments.",
        "When LLM and web retrieval are enabled, prioritize the latest official indicators in the digest, then layer recent policy and competitive reporting.",
      ],
    },
    {
      number: 2,
      title: "Supplier Power",
      accent: "supplier_power",
      bullets: [
        "Supplier concentration and switching costs are sector-specific—commodity versus differentiated inputs drive different leverage.",
        "Input price volatility (for example agricultural or energy inputs) affects margins—monitor commodity benchmarks and exchange rates.",
        "Backward integration by downstream processors can shift bargaining power along the chain.",
        "Regional logistics and trade corridors affect sourcing options and backup suppliers.",
        "Anchor cost narratives in the latest digest figures where relevant, then refine with supplier and trade intelligence from the web.",
      ],
    },
    {
      number: 3,
      title: "Buyer Power",
      accent: "buyer_power",
      bullets: [
        "Retail consolidation and e-commerce platforms often increase buyer leverage in consumer-facing segments.",
        "B2B and B2C channels carry different price-discovery dynamics—segment the customer path deliberately.",
        "Price sensitivity links to income and necessity; GDP per capita and inflation series from the digest support high-level framing.",
        unemp
          ? `Labour market conditions (unemployment ${unemp.value.toFixed(1)}% in ${unemp.year}) inform household spending power at the macro level.`
          : "Unemployment and participation series in the digest help approximate consumer spending capacity.",
        "Combine digest anchors with current channel and promotional dynamics from web research when available.",
      ],
    },
    {
      number: 4,
      title: "Threat of Substitution",
      accent: "threat_substitutes",
      bullets: [
        `For ${industryLabel}, substitutes may include imports, private label, artisanal goods, or adjacent categories.`,
        "Health, sustainability, and convenience trends can shift demand—validate with consumer and trade reporting.",
        "Labelling, taxation, and standards can change the relative appeal of substitutes.",
        "Digital and service-based alternatives increasingly compete with physical goods in several industries.",
        "Use official trade and income proxies from the digest, then stress-test substitution risk with recent market coverage.",
      ],
    },
    {
      number: 5,
      title: "Competitive Rivalry",
      accent: "rivalry",
      bullets: [
        "Concentration, industry growth, fixed costs, and exit barriers drive rivalry intensity.",
        growth
          ? `Reported GDP growth (${growth.value.toFixed(1)}% in ${growth.year}) is a macro signal—slower expansion often tightens competition.`
          : "GDP growth from the digest helps benchmark whether demand expansion is easing competitive pressure.",
        "Domestic and multinational competitors vie on cost, innovation, and distribution—map leaders using sector and press sources.",
        "Commoditization and private-label expansion can compress margins even when revenues grow.",
        "Prioritize the freshest indicator years in the digest, then reconcile with multi-horizon industry news when the AI path is on.",
      ],
    },
  ];

  const dataPara1 = [
    gdp ? `nominal GDP (${gdp.year}) about ${fmtUsd(gdp.value)}` : null,
    pop ? `population (${pop.year}) near ${(pop.value / 1e6).toFixed(1)} million` : null,
    growth ? `GDP growth (${growth.year}) at ${growth.value.toFixed(1)}%` : null,
    unemp ? `unemployment (${unemp.year}) near ${unemp.value.toFixed(1)}%` : null,
  ]
    .filter(Boolean)
    .join("; ");

  const execP1 = `${countryName} (${cca3}) — ${industryLabel}. ${dataPara1 ? `Latest available indicator snapshot: ${dataPara1}.` : "The platform indicator digest underpins quantitative anchors for this scaffold."} Region: ${region}; World Bank income group: ${income}.`;

  const execP2 =
    "This template does not include live web retrieval. With TAVILY_API_KEY and GROQ_API_KEY configured, the service prioritizes the same digest figures first, then blends industry and competitive themes from the web across recent days through multi-year windows—without exposing internal retrieval labels in client text.";

  const execP3 =
    "Leadership should treat the five forces as a structured hypothesis set: refresh digest-linked metrics on each review cycle and corroborate qualitative force ratings with sector filings, channel checks, and legal review where commitments are material.";

  const threePara = (forceIdx: number, webPlaceholder: string, imp: string): string => {
    const f = forces[forceIdx]!;
    const p1 = `${f.title} for ${industryLabel} in ${countryName}: ${f.bullets.slice(0, 2).join(" ")}`;
    const p2 = webPlaceholder;
    const p3 = imp;
    return `${p1}\n\n${p2}\n\n${p3}`;
  };

  const comprehensiveSections: { title: string; body: string }[] = [
    { title: "Executive Summary", body: `${execP1}\n\n${execP2}\n\n${execP3}` },
    {
      title: "1. Threat of new entrants",
      body: threePara(
        0,
        "Without live web context in this template, infer entry barriers from income group, market scale from GDP and population in the digest, and typical capital intensity for the sector—verify with national investment promotion and licensing sources.",
        "Implication: treat entry threat as directional until web-sourced regulatory and competitive intelligence is available; prioritize segments where scale and policy clearly favour incumbents."
      ),
    },
    {
      title: "2. Bargaining power of suppliers",
      body: threePara(
        1,
        "Supplier power depends on input commoditization, logistics, and concentration among vendors; with web retrieval, prioritize evidence on commodity shocks, trade measures, and supplier restructuring from the past week through longer horizons.",
        "Implication: map backward-integration risk and pass-through using digest macro volatility proxies plus supplier and trade intelligence."
      ),
    },
    {
      title: "3. Bargaining power of buyers",
      body: threePara(
        2,
        "Channel structure—retail, e-commerce, B2B—requires sector and press evidence; the digest’s unemployment and income proxies inform spending power only at country level until channel-specific data are added.",
        "Implication: segment buyers and test price sensitivity against GDP per capita and inflation from the dashboard when narrative generation is enabled."
      ),
    },
    {
      title: "4. Threat of substitutes",
      body: threePara(
        3,
        "Substitutes span imports, private label, digital alternatives, and adjacent categories; qualitative shifts are best tracked with multi-horizon web research tied to this ISIC division.",
        "Implication: prioritize substitute threats where trade openness is high or switching costs appear low; validate with category studies where available."
      ),
    },
    {
      title: "5. Competitive rivalry",
      body: threePara(
        4,
        "Rivalry ties to growth and concentration; with web layers active, integrate very recent news with longer-run structural themes—always after anchoring the latest digest-backed macro figures.",
        "Implication: when growth slows in the digest, expect margin pressure unless differentiation or consolidation reshapes the game."
      ),
    },
  ];

  return polishPorterAnalysisForClient({
    forces,
    comprehensiveSections,
    newMarketAnalysis: [
      `Size opportunity for ${industryLabel} using labour, GDP, and population series from the digest, then refine with sector value-added data where you can obtain it.`,
      "Map tariff preferences and rules-of-origin benefits from applicable regional trade agreements.",
      "Align positioning with national digital, climate, and industrial policy themes visible in official plans and recent coverage.",
      "Pilot in the most data-transparent sub-market before national scale; confirm channel economics and regulatory fit.",
      "Re-run the analysis after major indicator revisions, elections, or FX shocks that alter entry and rivalry dynamics.",
    ],
    keyTakeaways: [
      "Macro indicators from the platform are directional for industry structure—pair with sector employment and margins when possible.",
      "Barriers to entry and rivalry intensity vary sharply by sub-sector and geography within the same ISIC division.",
      "Supplier and buyer power need channel-specific and product-specific validation beyond country aggregates.",
      "Substitution risk rises when consumer trends, technology, or trade policy shift faster than annual statistics update.",
      "The five forces are interdependent; a change in one force often feeds through to others within a few planning cycles.",
    ],
    recommendations: [
      "Configure GROQ_API_KEY and TAVILY_API_KEY so narratives prioritize digest metrics, then enrich with time-bounded web context.",
      "Cross-reference Porter output with PESTEL and the Country Dashboard for a consistent macro-to-industry storyline.",
      "Assign owners to refresh digest-linked figures each quarter and log observation years cited in internal memos.",
      "For material investments, commission legal and tax review of licensing, FDI rules, and competition law independently of AI text.",
      "Save a baseline Porter run after each major strategy offsite and diff forces quarter-on-quarter to track drift.",
    ],
  });
}
