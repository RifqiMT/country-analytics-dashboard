import { useEffect, useMemo, useState } from "react";
import { getJson, type DataProvidersPayload, type MetricDef } from "../api";
import { metricDisplayLabel } from "../lib/metricDisplay";

const CATEGORY_ORDER = ["general", "financial", "health", "education", "labour", "demographics"] as const;

const CATEGORY_LABEL: Record<string, string> = {
  general: "General",
  financial: "Financial",
  health: "Health & demographics",
  education: "Education",
  labour: "Labour",
  demographics: "Demographics",
};

const SOURCE_CHIP_DEFS: { id: string; label: string; test: (m: MetricDef) => boolean }[] = [
  {
    id: "wb",
    label: "World Bank",
    test: (m) =>
      /world bank|wdi|wb\b/i.test(m.sourceName + m.description) ||
      m.sourceUrl.includes("worldbank.org"),
  },
  { id: "imf", label: "IMF", test: (m) => /imf|weo/i.test(m.sourceName + m.description) },
  { id: "rest", label: "REST Countries", test: () => false },
  { id: "sau", label: "Sea Around Us", test: () => false },
  { id: "wikidata", label: "Wikidata", test: () => false },
  { id: "marine", label: "Marine Regions", test: () => false },
  { id: "ilo", label: "ILO", test: (m) => /ilo/i.test(m.sourceName + m.description) },
  { id: "who", label: "WHO", test: (m) => /who|world health/i.test(m.sourceName + m.description) },
  { id: "un", label: "UN", test: (m) => /\bun\b|united nations|wpp/i.test(m.sourceName + m.description) },
  { id: "fao", label: "FAO", test: (m) => /fao|food and agriculture/i.test(m.sourceName + m.description) },
  {
    id: "unesco",
    label: "UNESCO",
    test: (m) => /unesco|uis/i.test(m.sourceName + m.description),
  },
];

function metricSourceLinks(m: MetricDef): { name: string; url: string }[] {
  const links: { name: string; url: string }[] = [{ name: m.sourceName, url: m.sourceUrl }];
  if (/imf|weo/i.test(m.sourceName + m.description) && !m.sourceUrl.includes("imf.org")) {
    links.push({
      name: "IMF World Economic Outlook",
      url: "https://www.imf.org/en/Publications/WEO",
    });
  }
  if (m.uisIndicatorId) {
    links.push({
      name: `UNESCO UIS (${m.uisIndicatorId})`,
      url: "https://api.uis.unesco.org/api/public/documentation/",
    });
  }
  return links;
}

function ExternalIcon() {
  return (
    <svg className="ml-1 inline h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function MetricCard({ m }: { m: MetricDef }) {
  const links = metricSourceLinks(m);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">{m.label}</h3>
          <p className="mt-1 text-xs text-slate-500">
            In charts &amp; tables: <span className="font-medium text-slate-700">{metricDisplayLabel(m)}</span>
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {m.unit}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{m.description}</p>
      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Formula</p>
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800">
          {m.formula ?? (
            <span className="font-sans text-slate-500">
              As defined by the primary indicator; see source documentation.
            </span>
          )}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sources</p>
        <ul className="mt-2 list-none space-y-1">
          {links.map((l, i) => (
            <li key={i}>
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline"
              >
                {l.name}
                <ExternalIcon />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function Sources() {
  const [metrics, setMetrics] = useState<MetricDef[]>([]);
  const [dataProviders, setDataProviders] = useState<DataProvidersPayload | null>(null);
  const [query, setQuery] = useState("");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [accordionOpen, setAccordionOpen] = useState(true);

  useEffect(() => {
    getJson<MetricDef[]>("/api/metrics").then(setMetrics).catch(console.error);
  }, []);

  useEffect(() => {
    getJson<DataProvidersPayload>("/api/data-providers").then(setDataProviders).catch(console.error);
  }, []);

  const activeChips = useMemo(() => {
    return SOURCE_CHIP_DEFS.filter(
      (c) =>
        c.id === "rest" ||
        c.id === "sau" ||
        c.id === "marine" ||
        c.id === "wikidata" ||
        metrics.some(c.test)
    );
  }, [metrics]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return metrics.filter((m) => {
      if (q) {
        const hay = `${m.label} ${m.shortLabel ?? ""} ${m.description} ${m.formula ?? ""} ${m.sourceName} ${m.worldBankCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (selectedSources.size > 0) {
        const matches = [...selectedSources].some((id) => {
          const def = SOURCE_CHIP_DEFS.find((d) => d.id === id);
          return def?.test(m);
        });
        if (!matches) return false;
      }
      return true;
    });
  }, [metrics, query, selectedSources]);

  const byCat = useMemo(() => {
    const acc: Record<string, MetricDef[]> = {};
    for (const m of filtered) {
      acc[m.category] = acc[m.category] ?? [];
      acc[m.category].push(m);
    }
    return acc;
  }, [filtered]);

  const toggleChip = (id: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">
            Data Sources &amp; Methodology
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            The stack is built around <strong>credible public institutions</strong>:{" "}
            <strong>World Bank WDI</strong> for almost all quantitative series, the <strong>World Bank Country API</strong>{" "}
            for income and lending metadata, <strong>IMF WEO (DataMapper)</strong> where a metric defines an IMF
            fallback, <strong>REST Countries</strong> for geography and ISO/UN codes, <strong>Sea Around Us</strong> for
            EEZ area when their API returns a match, and <strong>Wikidata</strong> only to fill REST Countries gaps
            (e.g. government type). <strong>UNESCO UIS</strong> indicators appear as <strong>WDI indicator codes</strong>{" "}
            so units and revisions stay aligned with the Bank; direct UIS API wiring can be added later for targeted
            gap-fills.
          </p>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            Outbound calls use a shared user-agent, short exponential retries on transient HTTP errors (429 / 5xx), and
            server-side caching. The canonical provider list and merge order for time series live at{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">GET /api/data-providers</code> and in the
            cards below.
          </p>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            Indicator codes, units, and formulas are documented per metric in the searchable dictionary.
          </p>
        </div>

        {dataProviders && (
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Country time-series merge order
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{dataProviders.seriesMergePipeline}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {dataProviders.providers.map((p) => (
                <article
                  key={p.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{p.institution}</p>
                  <h2 className="mt-1 text-base font-bold text-slate-900">{p.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">{p.role}</p>
                  {p.seriesMergeOrder != null && (
                    <p className="mt-2 text-xs font-medium text-slate-500">Series merge step: {p.seriesMergeOrder}</p>
                  )}
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                    {p.usedFor.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                  {p.notes && <p className="mt-3 text-xs leading-relaxed text-slate-500">{p.notes}</p>}
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Official site / API
                    <ExternalIcon />
                  </a>
                </article>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setAccordionOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Where metrics and information appear
            <svg
              className={`h-5 w-5 text-slate-500 transition ${accordionOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {accordionOpen && (
            <div className="space-y-4 border-t border-slate-200 px-4 py-4 text-sm leading-relaxed text-slate-600">
              <div>
                <p className="font-bold text-slate-900">Country Dashboard</p>
                <p className="mt-1">
                  Summary KPI cards, timeline accordions (Financial, Population, Macro, Unemployment),
                  and the country comparison table. Some territories use alternate ISO mappings or
                  proxy series where WDI coverage is partial.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Global Analytics (Map, Table, Charts)</p>
                <p className="mt-1">
                  Region filters apply to the map and table. Choropleth metrics mirror core global financial
                  and demographic indicators from the catalog (GDP variants, debt, inflation, unemployment,
                  poverty, population, life expectancy, age shares, and more). Map shapes come from world-atlas
                  (country names only); the app resolves each polygon to ISO3 using REST Countries (common and
                  official names) plus World Bank country labels so choropleth values align with snapshot data.
                  The global table groups columns by category. The General tab resolves EEZ area (km²) from
                  Sea Around Us (UN M.49) plus a bundled reference table; landlocked countries show an explicit
                  “no EEZ” label. Financial and health cells use WDI with IMF WEO and UNESCO UIS gap-fills
                  where each metric defines them.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Global Charts</p>
                <p className="mt-1">
                  Aggregated world (WLD) time series for macro and thematic comparisons across years.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-900">PESTEL &amp; Porter&apos;s Five Forces</p>
                <p className="mt-1">
                  Narrative sections use an LLM when API keys are configured, grounded on dashboard
                  series and optional web search; otherwise structured data-only templates from World
                  Bank bundles and REST Countries metadata.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Business Analytics</p>
                <p className="mt-1">
                  Multi-metric scatter plots over country–year observations; Pearson correlation
                  coefficients, regression lines, residual plots, and subgroup summaries are computed in
                  the API from the same indicator definitions as elsewhere.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Analytics Assistant</p>
                <p className="mt-1">
                  Injects latest dashboard metrics for a focus country when provided, optional Tavily
                  web context, and Groq for synthesis, with source lines echoed in the chat.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search metrics by name, description, formula, or source..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
          />
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Filter by source:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {activeChips.map((c) => {
              const active = selectedSources.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChip(c.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-slate-800 bg-slate-100 text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {CATEGORY_ORDER.map((cat) => {
          const list = byCat[cat];
          if (!list?.length) return null;
          return (
            <section key={cat} className="mt-10">
              <h2 className="text-lg font-bold text-slate-900">
                {CATEGORY_LABEL[cat] ?? cat}
              </h2>
              <div className="mt-4 space-y-4">
                {list.map((m) => (
                  <MetricCard key={m.id} m={m} />
                ))}
              </div>
            </section>
          );
        })}

        {filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-slate-500">No metrics match your filters.</p>
        )}
      </div>
    </div>
  );
}
