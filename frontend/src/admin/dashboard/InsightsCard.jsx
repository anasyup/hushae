import { useEffect, useState } from 'react';
import { Clock, Lightbulb, MapPin, TrendingUp, Users, Zap } from 'lucide-react';

const ICONS = { MapPin, TrendingUp, Zap, Clock, Users };

/** Rotating observations derived from live data — one at a time, no clutter. */
export default function InsightsCard({ insights }) {
  const [i, setI] = useState(0);
  const list = insights || [];

  useEffect(() => {
    if (list.length < 2) return undefined;
    const t = setInterval(() => setI((p) => (p + 1) % list.length), 8000);
    return () => clearInterval(t);
  }, [list.length]);

  if (list.length === 0) return null;
  const cur = list[Math.min(i, list.length - 1)];
  const Icon = ICONS[cur.icon] || Lightbulb;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-900 p-5 text-white">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
          <Icon size={16} className="text-amber-300" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold uppercase tracking-widest text-neutral-400">Smart insight</p>
          <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-neutral-50">{cur.text}</p>
          {cur.hint && <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-400">{cur.hint}</p>}
        </div>
      </div>

      {list.length > 1 && (
        <div className="mt-4 flex items-center gap-1.5">
          {list.map((x, n) => (
            <button
              key={x.id}
              onClick={() => setI(n)}
              className={`h-1 rounded-full transition-all ${n === i ? 'w-6 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/60'}`}
              aria-label={`Insight ${n + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
