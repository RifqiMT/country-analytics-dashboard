import type { SortDir } from "../../lib/tableSort";

type Props = {
  columnKey: string;
  sortKey: string | null;
  sortDir: SortDir;
  onSort: (key: string) => void;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  title?: string;
};

export default function SortableTh({
  columnKey,
  sortKey,
  sortDir,
  onSort,
  children,
  className = "",
  align = "left",
  title,
}: Props) {
  const active = sortKey === columnKey;
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const btnFlex =
    align === "right" ? "w-full justify-end" : align === "center" ? "w-full justify-center" : "inline-flex";

  return (
    <th scope="col" title={title} className={`${alignCls} ${className}`.trim()}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`${btnFlex} max-w-full items-center gap-1 rounded-md px-1 py-0.5 -mx-0.5 font-inherit transition hover:bg-slate-200/60`}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span className="min-w-0 truncate">{children}</span>
        <span className="flex shrink-0 flex-col text-[9px] leading-[0.65] text-slate-400" aria-hidden>
          <span className={active && sortDir === "asc" ? "text-slate-800" : ""}>▲</span>
          <span className={active && sortDir === "desc" ? "text-slate-800" : ""}>▼</span>
        </span>
      </button>
    </th>
  );
}
