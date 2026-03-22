export default function PestelBulletCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
        {items.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
