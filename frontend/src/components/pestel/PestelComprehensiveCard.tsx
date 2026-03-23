import type { ComprehensiveSection } from "../../types/pestel";

export default function PestelComprehensiveCard({ sections }: { sections: ComprehensiveSection[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-slate-900">Comprehensive Analysis</h2>
      <p className="mt-2 text-sm text-slate-500">
        Each section is two short paragraphs: what the dashboard series show, and what it implies for this theme—written
        as one coherent brief, not a labeled outline.
      </p>
      <div className="mt-4 border-t border-slate-200 pt-6">
        <div className="space-y-8">
          {sections.map((s, i) => (
            <div key={i}>
              <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                {s.body.split(/\n\n+/).map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
