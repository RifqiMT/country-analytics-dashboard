import { useState } from "react";
import CountrySelect from "../components/CountrySelect";
import { postJson } from "../api";
import type { PestelAnalysis } from "../types/pestel";
import PestelDimensionCard from "../components/pestel/PestelDimensionCard";
import PestelSwotGrid from "../components/pestel/PestelSwotGrid";
import PestelComprehensiveCard from "../components/pestel/PestelComprehensiveCard";
import PestelStrategicCard from "../components/pestel/PestelStrategicCard";
import PestelBulletCard from "../components/pestel/PestelBulletCard";
import { maxSelectableYear } from "../lib/yearBounds";

const WandIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.5 4.5L19 12l-5.5 3L10 19l-2.5-4L2 12l5.5-3L10 5z"
    />
  </svg>
);

export default function Pestel() {
  const [country, setCountry] = useState("IDN");
  const year = maxSelectableYear();
  const [analysis, setAnalysis] = useState<PestelAnalysis | null>(null);
  const [attr, setAttr] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    if (!country) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await postJson<{ analysis: PestelAnalysis; attribution: string[] }>("/api/analysis/pestel", {
        countryCode: country,
        year,
      });
      setAnalysis(res.analysis);
      setAttr(res.attribution);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">PESTEL ANALYSIS</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Comprehensive macro-environmental analysis (Political, Economic, Social, Technological, Environmental,
          Legal) with PESTEL-SWOT matrix (Opportunities and Risks), new market analysis, key takeaways, and
          actionable recommendations. Uses the same analyst-grade data as the platform (World Bank, UN, WHO, IMF;
          2000 – latest) and supplements with web search for dimensions with limited dashboard data.
        </p>

        <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50/80 p-5 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Country</p>
              <p className="text-xs text-slate-500">Choose the focus country for the dashboard and map.</p>
              <div className="mt-3 max-w-xl">
                <CountrySelect value={country} onChange={setCountry} variant="light" showLabel={false} />
              </div>
            </div>
            <button
              type="button"
              onClick={run}
              disabled={!country || loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-40 lg:self-end"
            >
              <WandIcon />
              {loading ? "Generating…" : "Generate PESTEL Analysis"}
            </button>
          </div>
        </div>
      </div>

      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
      )}

      {attr.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
          <span className="font-semibold text-slate-600">Sources · </span>
          {attr.join(" · ")}
        </div>
      )}

      {analysis && (
        <div className="space-y-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">PESTEL Analysis</h2>
            <p className="mt-1 text-sm text-slate-500">Summarized bullet points by macro-environmental factor.</p>
            <div className="mt-6 space-y-4">
              {analysis.pestelDimensions.map((dim) => (
                <PestelDimensionCard key={`${dim.label}-${dim.letter}`} dim={dim} />
              ))}
            </div>
          </div>

          <PestelSwotGrid swot={analysis.swot} />
          <PestelComprehensiveCard sections={analysis.comprehensiveSections} />
          <PestelStrategicCard sections={analysis.strategicBusiness} />
          <PestelBulletCard title="New Market Analysis" items={analysis.newMarketAnalysis} />
          <PestelBulletCard title="Key Takeaways" items={analysis.keyTakeaways} />
          <PestelBulletCard title="Recommendations" items={analysis.recommendations} />
        </div>
      )}
    </div>
  );
}
