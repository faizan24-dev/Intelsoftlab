"use client";

// Extraction breakdown — part-to-whole donut with a value legend, plus a ranked
// bar list underneath (a donut shows composition at a glance but cannot compare
// close values, so the precise numbers live in the bars and the legend).

import { useMemo, useState } from "react";

export interface ChartDatum {
  label: string;
  value: number;
}

// Categorical slots in fixed order — never cycled, never reassigned by rank.
// Validated on a white surface: lightness band, chroma floor, CVD separation
// (worst adjacent ΔE 9.1) and normal-vision floor (19.6) all pass. Three slots
// sit under 3:1 contrast, so every value carries a visible text label.
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const OTHER = "#94a3b8";

const MAX_SLICES = 6; // past this, the tail folds into "Other"

const RADIUS = 70;
const STROKE = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3; // surface gap between segments, in path units

/**
 * Arc offsets accumulate around the ring; each segment gives back GAP units of
 * surface so neighbouring fills never touch (the gap does the separating — no
 * stroke around a mark).
 */
function buildArcs(values: number[], total: number) {
  const arcs: { dash: number; offset: number }[] = [];
  let offset = 0;
  for (const value of values) {
    const length = (value / total) * CIRCUMFERENCE;
    arcs.push({
      dash: values.length === 1 ? CIRCUMFERENCE : Math.max(length - GAP, 1.5),
      offset,
    });
    offset += length;
  }
  return arcs;
}

/** Largest-remainder rounding so the displayed percentages total 100. */
function toPercents(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const byFraction = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of byFraction) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

export default function ExtractionChart({ data }: { data: ChartDatum[] }) {
  const [active, setActive] = useState<number | null>(null);

  const { rows, slices, total } = useMemo(() => {
    const ranked = data
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
    const sum = ranked.reduce((a, d) => a + d.value, 0);

    // Colour follows the entity: the top categories keep their slot, everything
    // beyond the donut's capacity shares the neutral "Other" grey.
    const rowsOut = ranked.map((d, i) => ({
      ...d,
      color: ranked.length > MAX_SLICES && i >= MAX_SLICES - 1 ? OTHER : SERIES[i % SERIES.length],
    }));

    const folded = ranked.length > MAX_SLICES;
    let sliceSource: ChartDatum[] = ranked;
    if (folded) {
      const head = ranked.slice(0, MAX_SLICES - 1);
      const tail = ranked.slice(MAX_SLICES - 1);
      sliceSource = [
        ...head,
        { label: `Other (${tail.length})`, value: tail.reduce((a, d) => a + d.value, 0) },
      ];
    }

    const percents = toPercents(sliceSource.map((d) => d.value));
    const slicesOut = sliceSource.map((d, i) => ({
      ...d,
      percent: percents[i],
      color: folded && i === MAX_SLICES - 1 ? OTHER : SERIES[i],
    }));

    return { rows: rowsOut, slices: slicesOut, total: sum };
  }, [data]);

  if (!total) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-muted">
        Nothing to chart yet — no contact data was found on this site.
      </p>
    );
  }

  const max = Math.max(...rows.map((r) => r.value));
  const focused = active !== null ? slices[active] : null;

  const arcs = buildArcs(slices.map((s) => s.value), total);

  return (
    <div>
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-10">
        {/* Donut */}
        <div className="relative shrink-0">
          <svg
            viewBox="0 0 200 200"
            className="h-[196px] w-[196px] -rotate-90"
            role="img"
            aria-label={`Extraction breakdown: ${slices
              .map((s) => `${s.label} ${s.value} (${s.percent}%)`)
              .join(", ")}`}
          >
            <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
            {arcs.map((arc, i) => (
              <circle
                key={slices[i].label}
                cx="100"
                cy="100"
                r={RADIUS}
                fill="none"
                stroke={slices[i].color}
                strokeWidth={STROKE}
                strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
                strokeDashoffset={-arc.offset}
                className="cursor-default transition-opacity duration-200"
                style={{
                  pointerEvents: "stroke",
                  opacity: active === null || active === i ? 1 : 0.28,
                }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </svg>

          {/* Centre readout: the total, or the hovered slice's share. */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[34px] font-semibold leading-none text-ink">
              {focused ? `${focused.percent}%` : total}
            </span>
            <span className="mt-1.5 max-w-[104px] truncate text-[11px] font-medium uppercase tracking-wide text-muted">
              {focused ? focused.label : "data points"}
            </span>
          </div>
        </div>

        {/* Legend — the always-visible identity and value channel. */}
        <ul className="w-full min-w-0 max-w-sm flex-1 space-y-0.5">
          {slices.map((s, i) => (
            <li key={s.label}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  active === i ? "bg-slate-50" : ""
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-soft">
                  {s.label}
                </span>
                <span className="text-sm font-semibold tabular-nums text-ink">{s.value}</span>
                <span className="w-11 shrink-0 text-right text-xs tabular-nums text-muted">
                  {s.percent}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Ranked detail — donuts can't compare close values, so the bars do. */}
      {rows.length > 1 && (
        <div className="mt-7 border-t border-slate-100 pt-5">
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            By category
          </h4>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-right text-xs font-medium text-ink-soft sm:w-32">
                  {r.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-sm bg-slate-100">
                  <div
                    className="h-full rounded-r-[4px] transition-all duration-300"
                    style={{ width: `${(r.value / max) * 100}%`, backgroundColor: r.color }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-ink">
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
