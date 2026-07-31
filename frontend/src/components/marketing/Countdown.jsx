import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { timeLeft, timeLeftWords } from '../../lib/marketingConfig';

/* ============================================================================
 * COUNTDOWN
 *
 * The accessibility problem this solves: a live region that updates every
 * second makes a screen reader read the clock aloud, forever. The brief calls
 * it out, and it is the single most common way countdowns break assistive
 * tech.
 *
 * So there are two representations:
 *   · the visible digits, aria-hidden, ticking once a second
 *   · one sr-only sentence, updated at most every minute, in aria-live=polite
 *
 * A sighted shopper gets urgency. A screen-reader user gets "2 hours and 14
 * minutes left" once, then silence until the minute changes.
 *
 * Layout: the digit box is a fixed width with tabular numerals, so 09 → 10
 * cannot nudge anything sideways. Nothing here can move the page.
 * ========================================================================== */

const pad = (n) => String(n).padStart(2, '0');

export default function Countdown({ endsAt, label = 'Ends in', urgentMinutes = 60, compact = false, onEnd }) {
  const [t, setT] = useState(() => timeLeft(endsAt));
  const [words, setWords] = useState(() => timeLeftWords(endsAt));
  const lastMinute = useRef(-1);
  const ended = useRef(false);

  useEffect(() => {
    setT(timeLeft(endsAt));
    setWords(timeLeftWords(endsAt));
    lastMinute.current = -1;
    ended.current = false;
    if (!endsAt) return undefined;

    const tick = () => {
      const next = timeLeft(endsAt);
      setT(next);
      if (!next) {
        if (!ended.current) { ended.current = true; onEnd?.(); }
        return;
      }
      // Announce only when the minute changes, never per second.
      const mins = next.days * 1440 + next.hours * 60 + next.minutes;
      if (mins !== lastMinute.current) {
        lastMinute.current = mins;
        setWords(timeLeftWords(endsAt));
      }
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, onEnd]);

  if (!t) return null;

  const totalMinutes = t.days * 1440 + t.hours * 60 + t.minutes;
  const urgent = totalMinutes <= (Number(urgentMinutes) || 60);

  const Cell = ({ value, unit }) => (
    <span className="inline-flex flex-col items-center">
      <span className={`min-w-[2.25rem] rounded-control px-1.5 py-1 text-center font-mono text-body-sm font-semibold tabular-nums ${urgent ? 'bg-clay/20 text-obsidian' : 'bg-satin text-obsidian'}`}>
        {pad(value)}
      </span>
      <span className="mt-0.5 text-[10px] uppercase tracking-wider text-ash">{unit}</span>
    </span>
  );

  return (
    <span className={`inline-flex items-center gap-2 ${compact ? '' : 'flex-wrap'}`}>
      {!compact && (
        <span className="inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-ash">
          <Clock size={13} aria-hidden="true" />
          {label}
        </span>
      )}

      {/* Digits are decorative: the sentence below carries the meaning. */}
      <span className="inline-flex items-end gap-1" aria-hidden="true">
        {t.days > 0 && <Cell value={t.days} unit="d" />}
        <Cell value={t.hours} unit="h" />
        <Cell value={t.minutes} unit="m" />
        {t.days === 0 && <Cell value={t.seconds} unit="s" />}
      </span>

      {/* One sentence, at most once a minute. */}
      <span className="sr-only" aria-live="polite">{label}: {words}</span>
    </span>
  );
}
