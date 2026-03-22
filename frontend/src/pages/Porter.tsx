import { useEffect, useMemo, useState } from "react";
import CountrySelect from "../components/CountrySelect";
import { getJson, postJson } from "../api";
import type { PorterAnalysis, IloIsicDivision } from "../types/porter";
import PorterForcesHub from "../components/porter/PorterForcesHub";
import PorterComprehensiveCard from "../components/porter/PorterComprehensiveCard";
import PestelBulletCard from "../components/pestel/PestelBulletCard";
import { maxSelectableYear } from "../lib/yearBounds";
import { loadPorterFromCache, savePorterToCache } from "../lib/porterAnalysisCache";

const LightningIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

const defaultIndustry = "10 - Manufacture of food products";

function resolvedIndustrySector(industry: string, divisions: IloIsicDivision[]): string {
  if (industry.trim()) return industry;
  if (divisions.length) return `${divisions[0]!.code} - ${divisions[0]!.label}`;
  return defaultIndustry;
}

export default function Porter() {
  const [country, setCountry] = useState("IDN");
  const [industry, setIndustry] = useState(defaultIndustry);
  const [divisions, setDivisions] = useState<IloIsicDivision[]>([]);
  const year = maxSelectableYear();
  const [analysis, setAnalysis] = useState<PorterAnalysis | null>(null);
  const [attr, setAttr] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getJson<IloIsicDivision[]>("/api/ilo-isic-divisions")
      .then(setDivisions)
      .catch(() => setDivisions([]));
  }, []);

  const industryOptions = useMemo(
    () => (divisions.length ? divisions : [{ code: "10", label: "Manufacture of food products" }]),
    [divisions]
  );

  const industryForApi = resolvedIndustrySector(industry, divisions);

  useEffect(() => {
    if (!country) return;
    const hit = loadPorterFromCache(country, industryForApi);
    if (hit) {
      setAnalysis(hit.analysis);
      setAttr(hit.attribution);
    } else {
      setAnalysis(null);
      setAttr([]);
    }
  }, [country, industryForApi]);

  const run = async () => {
    if (!country) return;
    setLoading(true);
    setErr(null);
    try {
      const industryValue = industryForApi;
      const res = await postJson<{ analysis: PorterAnalysis; attribution: string[] }>(
        "/api/analysis/porter",
        { countryCode: country, year, industrySector: industryValue }
      );
      setAnalysis(res.analysis);
      setAttr(res.attribution);
      savePorterToCache(country, industryValue, res.analysis, res.attribution);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">
            Porter Five Forces
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            Industry attractiveness analysis (Threat of new entrants, Bargaining power of suppliers,
            Bargaining power of buyers, Threat of substitutes, Competitive rivalry) for the selected
            country and ILO-ISIC industry sector. Uses the same platform data (World Bank, UN, WHO, IMF;
            2000–{maxSelectableYear()}) and supplementary information from TAVILY, GROQ, or other LLMs.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50/80 p-5 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-8">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Country</p>
              <p className="text-xs text-slate-500">Choose the focus country for the dashboard and map.</p>
              <div className="mt-3 max-w-xl">
                <CountrySelect value={country} onChange={setCountry} variant="light" showLabel={false} />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Industry / sector (ILO-ISIC division)
              </p>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
              >
                {industryOptions.map((d) => {
                  const val = `${d.code} - ${d.label}`;
                  return (
                    <option key={d.code} value={val}>
                      {val}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              type="button"
              onClick={run}
              disabled={!country || loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-40 lg:self-end"
            >
              <LightningIcon />
              {loading ? "Generating…" : "Generate Porter 5 Forces Analysis"}
            </button>
          </div>
        </div>
      </div>

      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      )}

      {attr.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
          <span className="font-semibold text-slate-600">Sources · </span>
          {attr.join(" · ")}
        </div>
      )}

      {analysis && (
        <div className="space-y-10">
          <PorterForcesHub forces={analysis.forces} />
          <PorterComprehensiveCard sections={analysis.comprehensiveSections} />
          <PestelBulletCard title="New Market Analysis" items={analysis.newMarketAnalysis} />
          <PestelBulletCard title="Key Takeaways" items={analysis.keyTakeaways} />
          <PestelBulletCard title="Key Recommendations" items={analysis.recommendations} />
        </div>
      )}
    </div>
  );
}
