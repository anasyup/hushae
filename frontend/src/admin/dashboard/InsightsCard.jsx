import { useEffect, useState } from 'react';
import { Lightbulb, MapPin, TrendingUp, Zap } from 'lucide-react';

const ICONS = { MapPin, TrendingUp, Zap, Lightbulb };

/* Rotating observations — one at a time, quiet and editorial. */
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
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: 'var(--px-muted)' }}>Insight</p>
        <Icon size={14} strokeWidth={1.5} style={{ color: 'var(--px-faint)' }} aria-hidden="true" />
      </div>
      <p className="mt-4 text-[20px] font-semibold leading-snug" style={{ color: 'var(--px-ink)' }}>{cur.text}</p>
      {cur.hint && <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--px-muted)' }}>{cur.hint}</p>}
      {list.length > 1 && (
        <div className="mt-4 flex items-center gap-1.5">
          {list.map((x, n) => (
            <button
              key={x.id}
              onClick={() => setI(n)}
              className="h-px transition-all"
              style={{ width: n === i ? 24 : 10, background: n === i ? 'var(--px-accent)' : 'rgba(26,24,21,0.2)' }}
              aria-label={`Insight ${n + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
