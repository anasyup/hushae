import { useState } from 'react';
import { Star, Zap } from 'lucide-react';

/* ===========================================================================
 * Order quality badge — ATELIER (same tokens as the orders desk).
 * Five checks, one glanceable score. Colour never carries meaning.
 * =========================================================================== */

const FLAG_LABEL = {
  bulk: 'Bulk order',
  'high-value': 'High value',
  issue: 'Has issue',
  delayed: 'Delayed',
};

const fill = (score) => (score >= 4 ? 'text-[#111]' : score === 3 ? 'text-[#6b7280]' : 'text-[#9ca3af]');

export default function QualityBadge({ quality, compact = false }) {
  const [open, setOpen] = useState(false);
  if (!quality) return null;

  const { score, max = 5, reasons = [], flags = [], priority, hoursInStage } = quality;

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
        className="inline-flex items-center gap-0.5 px-0.5 py-0.5 text-[#6b7280]"
      >
        {compact ? (
          <>
            <Star size={10} className={fill(score)} fill="currentColor" />
            <span className={`text-[10px] font-semibold tabular-nums ${fill(score)}`}>{score}</span>
          </>
        ) : (
          Array.from({ length: max }).map((_, i) => (
            <Star
              key={i}
              size={10}
              className={i < score ? fill(score) : 'text-[#e5e7eb]'}
              fill={i < score ? 'currentColor' : 'none'}
            />
          ))
        )}
      </button>

      {priority === 'rush' && (
        <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#111]">
          <Zap size={9} /> Rush
        </span>
      )}

      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-6 z-40 w-56 rounded-[10px] border border-[#ececec] bg-white p-3 text-left shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
        >
          <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">Quality {score}/{max}</span>
          {reasons.map((r) => (
            <span key={r.label} className="flex items-center gap-1.5 py-0.5 text-[11.5px] text-[#111]">
              <span className={`grid h-3 w-3 shrink-0 place-items-center text-[9px] ${r.ok ? 'text-[#0e9f6e]' : 'text-[#9ca3af]'}`}>
                {r.ok ? '✓' : '✕'}
              </span>
              <span className={r.ok ? 'text-[#111]' : 'text-[#6b7280]'}>{r.label}</span>
            </span>
          ))}
          {flags.length > 0 && (
            <span className="mt-2 flex flex-wrap gap-2 border-t border-[#f1f1f1] pt-2">
              {flags.map((f) => (
                <span key={f} className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">
                  {FLAG_LABEL[f] || f}
                </span>
              ))}
            </span>
          )}
          {hoursInStage > 0 && (
            <span className="mt-2 block text-[10.5px] text-[#9ca3af]">
              {hoursInStage}h in current stage
            </span>
          )}
        </span>
      )}
    </span>
  );
}
