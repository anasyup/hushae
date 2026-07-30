import { useEffect, useRef, useState } from 'react';
import { Truck, Check } from 'lucide-react';
import { pkr } from '../../lib/format';
import { fill } from '../../lib/cartConfig';

/* ============================================================================
 * Free-shipping progress.
 *
 * The bar is a transform-only animation (scaleX) rather than an animated
 * `width`, so crossing the threshold never triggers layout — the row's height
 * is fixed by its content, and the fill paints on the compositor.
 *
 * Confetti fires ONCE, on the transition from locked → unlocked, and only when
 * the merchant has it switched on and the visitor has not asked for reduced
 * motion. It is rendered in an aria-hidden layer so it is invisible to
 * assistive tech; the status change is announced through the live region
 * instead of through decoration.
 * ========================================================================== */

const PIECES = Array.from({ length: 14 }, (_, i) => ({
  x: (i / 13) * 100,
  d: 0.45 + ((i * 37) % 40) / 100,
  r: ((i * 71) % 120) - 60,
  c: ['#8F9C8B', '#B3927E', '#C9BFB4', '#5C6A5A'][i % 4],
}));

export default function FreeShipProgress({ subtotal, threshold, cfg }) {
  const unlocked = subtotal >= threshold;
  const pct = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 100;
  const [burst, setBurst] = useState(false);
  const wasUnlocked = useRef(unlocked);

  useEffect(() => {
    const reduce = typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (unlocked && !wasUnlocked.current && cfg.confetti && !reduce) {
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 1400);
      return () => clearTimeout(t);
    }
    wasUnlocked.current = unlocked;
    return undefined;
  }, [unlocked, cfg.confetti]);

  if (!cfg.showProgress || threshold <= 0) return null;

  const remaining = Math.max(0, threshold - subtotal);
  const message = unlocked
    ? cfg.progressDone
    : fill(cfg.progressAway, { amount: pkr(remaining) });

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors duration-base ${
            unlocked ? 'bg-sagedeep text-white' : 'bg-satin text-ash'
          }`}
          aria-hidden="true"
        >
          {unlocked ? <Check size={14} strokeWidth={2.4} /> : <Truck size={13} strokeWidth={1.8} />}
        </span>
        <p className={`text-body-sm leading-tight ${unlocked ? 'font-medium text-sagedeep' : 'text-ash'}`}>
          {message}
        </p>
      </div>

      {/* Track. Transform-only fill → no layout on change. */}
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-satin">
        <div
          className={`h-full origin-left rounded-full transition-transform duration-slow ease-standard motion-reduce:transition-none ${
            unlocked ? 'bg-sagedeep' : 'bg-sage'
          }`}
          style={{ transform: `scaleX(${pct / 100})`, width: '100%' }}
        />
      </div>

      {/* Screen-reader status. Decoration above is aria-hidden. */}
      <p className="sr-only" role="status">{message}</p>

      {burst && (
        <div className="pointer-events-none absolute inset-x-0 -top-1 h-16 overflow-hidden" aria-hidden="true">
          {PIECES.map((p, i) => (
            <span
              key={i}
              className="confetti-bit"
              style={{
                left: `${p.x}%`,
                background: p.c,
                animationDelay: `${p.d * 0.18}s`,
                '--r': `${p.r}deg`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
