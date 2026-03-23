import { useRef } from "react";
import type { PorterForce } from "../../types/porter";
import PorterForceCard from "./PorterForceCard";
import ExportPngButton from "../ExportPngButton";

/** Hub-and-spoke layout: center = rivalry (5), top = threat new entry (1), left = supplier (2), right = buyer (3), bottom = substitutes (4) */
export default function PorterForcesHub({ forces }: { forces: PorterForce[] }) {
  const byNum = new Map(forces.map((f) => [f.number, f]));
  const f1 = byNum.get(1);
  const f2 = byNum.get(2);
  const f3 = byNum.get(3);
  const f4 = byNum.get(4);
  const f5 = byNum.get(5);
  const sectionRef = useRef<HTMLElement | null>(null);

  return (
    <section ref={(n) => (sectionRef.current = n)} className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Competitive Analysis</p>
          <h2 className="text-2xl font-bold text-slate-900">Porter&apos;s Five Forces Analysis</h2>
        </div>
        <div className="sm:self-end">
          <ExportPngButton
            getTarget={() => sectionRef.current}
            filename="porter_5_forces_analysis.png"
            size="md"
            title="Export Porter 5 Forces (PNG)"
          />
        </div>
      </div>
      <div className="relative grid grid-cols-1 grid-rows-[auto_1fr_auto_1fr_auto] gap-4 sm:grid-cols-3 sm:grid-rows-3">
        {f1 && (
          <div className="sm:col-start-2 sm:row-start-1">
            <PorterForceCard force={f1} />
          </div>
        )}
        {f2 && (
          <div className="sm:col-start-1 sm:row-start-2">
            <PorterForceCard force={f2} />
          </div>
        )}
        {f5 && (
          <div className="sm:col-start-2 sm:row-start-2">
            <PorterForceCard force={f5} />
          </div>
        )}
        {f3 && (
          <div className="sm:col-start-3 sm:row-start-2">
            <PorterForceCard force={f3} />
          </div>
        )}
        {f4 && (
          <div className="sm:col-start-2 sm:row-start-3">
            <PorterForceCard force={f4} />
          </div>
        )}
      </div>
    </section>
  );
}
