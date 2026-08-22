/* ===========================================================================
 * Analytics — monochrome chart primitives (presentation only).
 * White / opacity layers. No colour, no gradients.
 * =========================================================================== */

export const monoTooltip = {
  contentStyle: {
    background: '#0A0A0A',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 4,
    fontSize: 12,
    color: '#FFFFFF',
    boxShadow: 'none',
  },
  labelStyle: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  itemStyle: { color: '#FFFFFF' },
};

export const monoAxis = {
  stroke: 'rgba(255,255,255,0.4)',
  tick: { fontSize: 10, fill: 'rgba(255,255,255,0.4)' },
  tickLine: false,
  axisLine: false,
};

export const monoGrid = {
  strokeDasharray: '3 4',
  stroke: 'rgba(255,255,255,0.05)',
  vertical: false,
};

const dayLabel = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Editorial line — white stroke, flat low-opacity fill (no gradient). */
export function MonoLine({ data, k, height = 200, fmt = (v) => v }) {
  if (!data?.length) return <p className="py-10 text-center text-[12px] text-white/35">No series for this range.</p>;
  const w = 720;
  const h = height;
  const padX = 8;
  const padY = 16;
  const max = Math.max(...data.map((d) => Number(d[k]) || 0), 1);
  const pts = data.map((d, i) => [
    padX + (i * (w - 2 * padX)) / Math.max(data.length - 1, 1),
    h - padY - ((Number(d[k]) || 0) / max) * (h - 2 * padY),
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]},${h - padY} L${pts[0][0]},${h - padY} Z`;
  const ticks = data.filter((_, i) => i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0);
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="min-w-[420px]" role="img">
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={w - padX}
            y1={h - padY - f * (h - 2 * padY)}
            y2={h - padY - f * (h - 2 * padY)}
            stroke="rgba(255,255,255,0.05)"
          />
        ))}
        {pts.length > 1 && (
          <>
            <path d={area} fill="rgba(255,255,255,0.08)" />
            <path d={line} fill="none" stroke="#FFFFFF" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={pts.length > 40 ? 1.4 : 2.4} fill="#0A0A0A" stroke="#FFFFFF" strokeWidth="1.4">
            <title>{`${dayLabel(data[i].date)} — ${fmt(data[i][k])}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between px-0.5 text-[10px] uppercase tracking-[0.12em] text-white/30">
        {ticks.map((d) => <span key={d.date}>{dayLabel(d.date)}</span>)}
      </div>
    </div>
  );
}

/** Ranked hairline bars — thickness/opacity, never colour. */
export function RankedBars({ rows, fmt = (v) => v, empty = 'No data for this range yet' }) {
  if (!rows?.length) return <p className="border-y border-white/10 py-8 text-center text-[12px] text-white/35">{empty}</p>;
  const max = Math.max(...rows.map((r) => Number(r.value) || 0), 1);
  return (
    <ul>
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 border-b border-white/5 py-2.5">
          <span className="w-36 shrink-0 truncate text-[12px] text-white/80 sm:w-44" title={r.label}>{r.label}</span>
          <span className="h-px min-w-0 flex-1 bg-white/10" aria-hidden>
            <span className="block h-px bg-white" style={{ width: `${Math.max(2, ((Number(r.value) || 0) / max) * 100)}%` }} />
          </span>
          <span className="w-28 shrink-0 text-right text-[11px] tabular-nums text-white/70">
            {fmt(r.value)}
            {r.sub ? <span className="ml-1 text-white/30">{r.sub}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ChartSkeleton({ height = 180 }) {
  return (
    <div className="border-y border-white/10 py-6" aria-hidden>
      <div className="animate-pulse bg-white/10" style={{ height }} />
    </div>
  );
}
