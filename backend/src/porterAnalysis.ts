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

export function parsePorterFromLlm(text: string): Partial<PorterAnalysis> | null {
  let t = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(t);
  if (fence) t = fence[1].trim();
  try {
    const o = JSON.parse(t) as unknown;
    if (!o || typeof o !== "object") return null;
    const r = o as Record<string, unknown>;
    const forcesRaw = (r.forces ?? r.fiveForces ?? r.five_forces) as unknown;
    const forces: PorterForce[] = [];
    if (Array.isArray(forcesRaw)) {
      const accMap: Record<string, string> = {
        threat_new_entry: "threat_new_entry",
        supplier_power: "supplier_power",
        buyer_power: "buyer_power",
        threat_substitutes: "threat_substitutes",
        rivalry: "rivalry",
      };
      const titleMap: Record<string, string> = {
        "threat of new entrants": "Threat of New Entry",
        "threat of new entry": "Threat of New Entry",
        "supplier power": "Supplier Power",
        "buyer power": "Buyer Power",
        "threat of substitutes": "Threat of Substitution",
        "threat of substitution": "Threat of Substitution",
        "competitive rivalry": "Competitive Rivalry",
      };
      for (let i = 0; i < Math.min(forcesRaw.length, 5); i++) {
        const item = forcesRaw[i];
        if (!item || typeof item !== "object") continue;
        const it = item as Record<string, unknown>;
        const n = typeof it.number === "number" ? it.number : i + 1;
        const num = Math.min(5, Math.max(1, n)) as 1 | 2 | 3 | 4 | 5;
        const bullets = strArray(it.bullets ?? it.points ?? it.content);
        const title =
          typeof it.title === "string"
            ? titleMap[it.title.toLowerCase()] ?? it.title
            : FORCE_TEMPLATE[i]?.title ?? "Force";
        const accent =
          (typeof it.accent === "string" && accMap[it.accent])
            ? accMap[it.accent]
            : (FORCE_TEMPLATE[i]?.accent ?? "rivalry");
        if (bullets.length) {
          forces.push({
            number: num,
            title,
            bullets,
            accent: typeof accent === "string" ? accent : FORCE_TEMPLATE[i]!.accent,
          });
        }
      }
    }

    const compRaw = r.comprehensiveSections ?? r.comprehensive ?? r.executiveSections;
    const comprehensiveSections: { title: string; body: string }[] = [];
    if (Array.isArray(compRaw)) {
      for (const item of compRaw) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const title = typeof o.title === "string" ? o.title : "Section";
        const body = typeof o.body === "string" ? o.body : "";
        if (body.trim()) comprehensiveSections.push({ title, body: body.trim() });
      }
    }

    return {
      forces: forces.length >= 5 ? forces : undefined,
      comprehensiveSections:
        comprehensiveSections.length >= 6 ? comprehensiveSections : undefined,
      newMarketAnalysis: strArray(r.newMarketAnalysis).length ? strArray(r.newMarketAnalysis) : undefined,
      keyTakeaways: strArray(r.keyTakeaways).length ? strArray(r.keyTakeaways) : undefined,
      recommendations: strArray(r.recommendations).length ? strArray(r.recommendations) : undefined,
    };
  } catch {
    return null;
  }
}

function nonemptyLines(a: string[] | undefined, min: number): string[] | null {
  const x = a?.filter(Boolean) ?? [];
  return x.length >= min ? x : null;
}

export function mergePorterAnalysis(partial: Partial<PorterAnalysis>, fallback: PorterAnalysis): PorterAnalysis {
  const forces =
    partial.forces?.length === 5
      ? partial.forces.map((f, i) => ({
          ...f,
          number: (i + 1) as 1 | 2 | 3 | 4 | 5,
          title: f.title || FORCE_TEMPLATE[i]!.title,
          accent: f.accent || FORCE_TEMPLATE[i]!.accent,
        }))
      : fallback.forces;

  const comprehensiveSections =
    partial.comprehensiveSections && partial.comprehensiveSections.length >= 6
      ? partial.comprehensiveSections
      : fallback.comprehensiveSections;

  return {
    forces,
    comprehensiveSections,
    newMarketAnalysis:
      nonemptyLines(partial.newMarketAnalysis, 3) ?? fallback.newMarketAnalysis,
    keyTakeaways: nonemptyLines(partial.keyTakeaways, 3) ?? fallback.keyTakeaways,
    recommendations:
      nonemptyLines(partial.recommendations, 2) ?? fallback.recommendations,
  };
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
        `Barriers to entry in ${industryLabel} vary by capital intensity and regulation — verify with sector-specific sources.`,
        income !== "—" ? `Income group (${income}) shapes domestic market scale and entry economics.` : "Use dashboard GDP and population to size addressable market.",
        "Regulatory and licensing requirements differ by jurisdiction — consult trade associations and ministry filings.",
        "Economies of scale and branding can deter entrants in concentrated sub-segments.",
        "Set GROQ_API_KEY for industry-tailored threat assessment.",
      ],
    },
    {
      number: 2,
      title: "Supplier Power",
      accent: "supplier_power",
      bullets: [
        "Supplier concentration and switching costs are sector-specific — commodity vs differentiated inputs matter.",
        "Input price volatility (agricultural, energy) affects margins — monitor commodity indices and FX.",
        "Backward integration by processors can alter bargaining dynamics.",
        "Regional supply chains and logistics (e.g. ASEAN) affect sourcing options.",
        "Data layer: macro WDI; supplement with sector reports for supplier structure.",
      ],
    },
    {
      number: 3,
      title: "Buyer Power",
      accent: "buyer_power",
      bullets: [
        "Retail consolidation (supermarkets, e-commerce) increases buyer leverage in many consumer-facing sectors.",
        "B2B vs B2C channels have different power structures — segment your target channel.",
        "Price sensitivity varies with income and product necessity — use GDP per capita and inflation series.",
        unemp ? `Unemployment (${unemp.year}): ${unemp.value.toFixed(1)}% — affects consumer spending power.` : "Labour market tightness affects wage pressure and purchasing power.",
        "Enable Groq for channel- and segment-specific buyer power narrative.",
      ],
    },
    {
      number: 4,
      title: "Threat of Substitution",
      accent: "threat_substitutes",
      bullets: [
        `In ${industryLabel}, substitutes include traditional, artisanal, or imported alternatives.`,
        "Health, sustainability, and convenience trends shift demand — qualitative; supplement with consumer research.",
        "Regulation (e.g. labeling, taxes) can alter relative attractiveness of substitutes.",
        "Digital and service-based substitutes increasingly compete with physical products in some categories.",
        "Cross-check with sector reports for substitution elasticities.",
      ],
    },
    {
      number: 5,
      title: "Competitive Rivalry",
      accent: "rivalry",
      bullets: [
        "Market concentration, growth rate, and exit barriers drive rivalry — use GDP growth and industry structure data.",
        growth ? `GDP growth (${growth.year}): ${growth.value.toFixed(1)}% — slower growth intensifies rivalry.` : "Slower growth typically intensifies price and non-price competition.",
        "Domestic and multinational players compete on cost, innovation, and distribution — map key players from trade data.",
        "Private-label expansion and commoditization pressure margins.",
        "Full narrative rivalry assessment requires LLM — set GROQ_API_KEY.",
      ],
    },
  ];

  const dataPara1 = [
    gdp ? `Nominal GDP (${gdp.year}) is approximately ${fmtUsd(gdp.value)}` : null,
    pop ? `population (${pop.year}) near ${(pop.value / 1e6).toFixed(1)} million` : null,
    growth ? `GDP growth (${growth.year}) at ${growth.value.toFixed(1)}%` : null,
    unemp ? `unemployment (${unemp.year}) near ${unemp.value.toFixed(1)}%` : null,
  ]
    .filter(Boolean)
    .join("; ");

  const execP1 = `${countryName} (${cca3}) — ${industryLabel}. ${dataPara1 ? `Latest digest signals: ${dataPara1}.` : "Macro series from the platform digest underpin this scaffold."} Region: ${region}; World Bank income group: ${income}.`;

  const execP2 =
    "Live web retrieval is not included in this offline scaffold. For the middle paragraph of each comprehensive block, enable TAVILY_API_KEY on the server so the model can ground industry and competitive news; until then, treat qualitative market colour as indicative only.";

  const execP3 =
    "Across Porter’s five forces, use the digest for quantitative anchors and supplement with sector reports and trade data. Enable GROQ_API_KEY for full three-paragraph, web-integrated narrative per force.";

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
        "Without live web context in this template, infer entry barriers from income group, market scale (GDP/population from digest), and typical capital intensity for the sector—verify with national investment promotion and licensing sources.",
        "Implication: entry threat is directional only until web-sourced regulatory and competitive intelligence is merged; prioritize segments where scale and policy clearly favour incumbents."
      ),
    },
    {
      title: "2. Bargaining power of suppliers",
      body: threePara(
        1,
        "Template mode: supplier power depends on input commoditization and logistics; add Tavily-backed excerpts for commodity shocks, trade measures, and concentration among key vendors.",
        "Implication: map backward integration risk and input cost pass-through using digest macro volatility proxies plus sector-specific supplier interviews or reports."
      ),
    },
    {
      title: "3. Bargaining power of buyers",
      body: threePara(
        2,
        "Template mode: channel structure (retail, e-commerce, B2B) requires web and trade data; digest unemployment and income proxies inform spending power only at country level.",
        "Implication: segment buyers by channel and test price sensitivity against GDP per capita and inflation series from the dashboard when Groq narrative is enabled."
      ),
    },
    {
      title: "4. Threat of substitutes",
      body: threePara(
        3,
        "Template mode: substitutes span imports, private label, digital alternatives, and adjacent categories—use web retrieval for consumer and technology shifts specific to this ISIC division.",
        "Implication: prioritize substitute threats where digest shows high trade openness or low switching costs; validate with category elasticity studies where available."
      ),
    },
    {
      title: "5. Competitive rivalry",
      body: threePara(
        4,
        "Template mode: rivalry intensity ties to growth and concentration; web context should name major players, price campaigns, and capacity additions when the LLM path is active.",
        "Implication: when growth slows (see digest GDP growth), expect margin pressure—combine with industry news for a calibrated rivalry score."
      ),
    },
  ];

  return {
    forces,
    comprehensiveSections,
    newMarketAnalysis: [
      `Screen ${industryLabel} against WDI labour, GDP, and population series for market sizing.`,
      "Identify tariff and non-tariff advantages from regional trade agreements.",
      "Map digital and sustainability positioning against national development priorities.",
    ],
    keyTakeaways: [
      "Macro proxies are directional — sector-level data (employment, value added) improves precision.",
      "Barriers to entry and rivalry intensity vary sharply by sub-sector and geography.",
      "Supplier and buyer power require channel- and product-specific validation.",
    ],
    recommendations: [
      "Enable GROQ_API_KEY for scored forces and industry-tailored narrative.",
      "Cross-reference with PESTEL and Country Dashboard for macro context.",
    ],
  };
}
