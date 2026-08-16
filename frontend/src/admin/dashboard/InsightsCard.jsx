import { useEffect, useState } from 'react';
import { Lightbulb, MapPin, TrendingUp, Zap } from 'lucide-react';

const ICONS = { MapPin, TrendingUp, Zap, Lightbulb };

/* Rotating observations — standard card treatment, Inter, no hero styling. */
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
        <p className="text-[11px] font-medium" style={{ color: 'var(--fs-text-muted)' }}>Insight</p>
        <Icon size={14} strokeWidth={1.5} style={{ color: 'var(--fs-text-muted)' }} aria-hidden="true" />
      </div>
      <p className="mt-3 text-[15px] font-medium leading-snug" style={{ color: 'var(--fs-text-primary)' }}>{cur.text}</p>
      {cur.hint && <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--fs-text-muted)' }}>{cur.hint}</p>}
      {list.length > 1 && (
        <div className="mt-3 flex items-center gap-1.5">
          {list.map((x, n) => (
            <button
              key={x.id}
              onClick={() => setI(n)}
              className="h-1 rounded-full transition-all"
              style={{ width: n === i ? 20 : 8, background: n === i ? 'var(--fs-accent)' : 'var(--fs-border-medium)' }}
              aria-label={`Insight ${n + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
