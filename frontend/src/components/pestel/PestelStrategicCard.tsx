import type { StrategicSection } from "../../types/pestel";

export default function PestelStrategicCard({ sections }: { sections: StrategicSection[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-slate-900">
        Strategic Implications for Business (PESTEL-SWOT)
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Each quadrant is two distinct paragraphs: grounded in dashboard metrics, refined with web context when available,
        and specific actions—wording should differ across Strengths, Weaknesses, Opportunities, and Threats.
      </p>
      <div className="mt-4 border-t border-slate-200 pt-6">
        <div className="space-y-8">
          {sections.map((s, i) => (
            <div key={i}>
              <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                {s.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
