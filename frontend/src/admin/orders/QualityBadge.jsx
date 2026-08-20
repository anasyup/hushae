import { useState } from 'react';
import { Star, Zap } from 'lucide-react';

/* ============================================================================
 * Order quality badge — five checks, one glanceable score.
 *
 * The tooltip explains exactly which checks passed, so the score is never a
 * mystery number the team has to reverse-engineer.
 * ========================================================================== */

const TONE = {
  low:  { text: 'text-[#9A5548]',     ring: 'ring-[#E0C6BE] bg-[#F5EDEB]' },
  mid:  { text: 'text-[#8F7448]',   ring: 'ring-[#DCCBA5] bg-[#F6F1E6]' },
  high: { text: 'text-[#4A6B58]', ring: 'ring-[#C9D8CE] bg-[#E9EFEA]' },
};

const FLAG_LABEL = {
  bulk: 'Bulk order',
  'high-value': 'High value',
  issue: 'Has issue',
  delayed: 'Delayed',
};

export default function QualityBadge({ quality, compact = false }) {
  const [open, setOpen] = useState(false);
  if (!quality) return null;

  const { score, max = 5, reasons = [], flags = [], priority, hoursInStage } = quality;
  const tone = score <= 2 ? TONE.low : score === 3 ? TONE.mid : TONE.high;

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`Order quality ${score} out of ${max}`}
        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 ring-1 ${tone.ring}`}
      >
        {compact ? (
          <>
            <Star size={10} className={tone.text} fill="currentColor" />
            <span className={`text-[12px] font-bold tabular-nums ${tone.text}`}>{score}</span>
          </>
        ) : (
          Array.from({ length: max }).map((_, i) => (
            <Star key={i} size={10} className={i < score ? tone.text : 'text-neutral-300'}
              fill={i < score ? 'currentColor' : 'none'} />
          ))
        )}
      </button>

      {priority === 'rush' && (
        <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          <Zap size={9} /> Rush
        </span>
      )}

      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-6 z-40 w-56 rounded-lg border border-neutral-200 bg-white p-2.5 text-left shadow-xl"
        >
          <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-neutral-500">
            Quality {score}/{max}
          </span>
          {reasons.map((r) => (
            <span key={r.label} className="flex items-center gap-1.5 py-0.5 text-[13px]">
              <span className={`grid h-3 w-3 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white ${
                r.ok ? 'bg-[#5B7F6A]' : 'bg-[#C08374]'}`}>
                {r.ok ? '✓' : '✕'}
              </span>
              <span className={r.ok ? 'text-neutral-600' : 'text-neutral-900'}>{r.label}</span>
            </span>
          ))}
          {flags.length > 0 && (
            <span className="mt-1.5 flex flex-wrap gap-1 border-t border-neutral-100 pt-1.5">
              {flags.map((f) => (
                <span key={f} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[13px] font-semibold text-neutral-700">
                  {FLAG_LABEL[f] || f}
                </span>
              ))}
            </span>
          )}
          {hoursInStage > 0 && (
            <span className="mt-1.5 block text-[12px] text-neutral-400">
              {hoursInStage}h in current stage
            </span>
          )}
        </span>
      )}
    </span>
  );
}
