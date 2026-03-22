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
        comprehensiveSections.length >= 2 ? comprehensiveSections : undefined,
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
    partial.comprehensiveSections && partial.comprehensiveSections.length >= 2
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

  const execBody = [
    `${countryName} (${cca3}) — ${industryLabel}. Competitive pressure assessment at country-industry level using macro and demographic proxies.`,
    gdp ? `Nominal GDP (${gdp.year}): ${fmtUsd(gdp.value)}.` : "",
    pop ? `Population (${pop.year}): ${(pop.value / 1e6).toFixed(1)} Mn.` : "",
    growth ? `GDP growth (${growth.year}): ${growth.value.toFixed(1)}%.` : "",
    `Region: ${region}; income group: ${income}.`,
    "Enable GROQ_API_KEY for sector-specific narrative and scored forces.",
  ]
    .filter(Boolean)
    .join("\n");

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

  const comprehensiveSections: { title: string; body: string }[] = [
    { title: "Executive Summary", body: execBody },
    {
      title: "1. Threat of new entrants",
      body: forces[0].bullets.join("\n\n"),
    },
    {
      title: "2. Bargaining power of suppliers",
      body: forces[1].bullets.join("\n\n"),
    },
    {
      title: "3. Bargaining power of buyers",
      body: forces[2].bullets.join("\n\n"),
    },
    {
      title: "4. Threat of substitutes",
      body: forces[3].bullets.join("\n\n"),
    },
    {
      title: "5. Competitive rivalry",
      body: forces[4].bullets.join("\n\n"),
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
