// Minimal dependency-free horizontal bar chart.

export interface BarDatum {
  label: string;
  value: number;
}

export default function BarChart({ data }: { data: BarDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.every((d) => d.value === 0)) {
    return <p className="text-sm text-muted">No data to chart.</p>;
  }
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-right text-xs font-medium text-ink-soft">
            {d.label}
          </span>
          <div className="h-6 flex-1 overflow-hidden rounded bg-slate-100">
            <div
              className="flex h-full items-center justify-end rounded bg-gradient-to-r from-brand-500 to-accent-500 px-2 text-[11px] font-semibold text-white transition-all"
              style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 8 : 0)}%` }}
            >
              {d.value > 0 ? d.value : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
