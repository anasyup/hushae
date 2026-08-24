import { useState } from 'react';
import { Star, Zap } from 'lucide-react';

/* ===========================================================================
 * Order quality badge — monochrome (Phase 03-R).
 * Five checks, one glanceable score. Colour never carries meaning.
 * ========================================================================== */

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
  const fill = score >= 4 ? 'text-black' : score === 3 ? 'text-[#555555]' : 'text-[#999999]';

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
        className="inline-flex items-center gap-0.5 px-0.5 py-0.5 text-[#777777]"
      >
        {compact ? (
          <>
            <Star size={10} className={fill} fill="currentColor" />
            <span className={`text-[10px] font-medium tabular-nums ${fill}`}>{score}</span>
          </>
        ) : (
          Array.from({ length: max }).map((_, i) => (
            <Star
              key={i}
              size={10}
              className={i < score ? fill : 'text-white/15'}
              fill={i < score ? 'currentColor' : 'none'}
            />
          ))
        )}
      </button>

      {priority === 'rush' && (
        <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-black">
          <Zap size={9} /> Rush
        </span>
      )}

      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-6 z-40 w-56 border border-[#EAEAEA] bg-[#0D0D0D] p-3 text-left"
        >
          <span className="adm-label mb-2 block">Quality {score}/{max}</span>
          {reasons.map((r) => (
            <span key={r.label} className="flex items-center gap-1.5 py-0.5 text-[12px]">
              <span className={`grid h-3 w-3 shrink-0 place-items-center text-[9px] ${r.ok ? 'text-black' : 'text-[#AAAAAA]'}`}>
                {r.ok ? '✓' : '✕'}
              </span>
              <span className={r.ok ? 'text-[#777777]' : 'text-black'}>{r.label}</span>
            </span>
          ))}
          {flags.length > 0 && (
            <span className="mt-2 flex flex-wrap gap-2 border-t border-[#EAEAEA] pt-2">
              {flags.map((f) => (
                <span key={f} className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#777777]">
                  {FLAG_LABEL[f] || f}
                </span>
              ))}
            </span>
          )}
          {hoursInStage > 0 && (
            <span className="mt-2 block text-[11px] text-[#AAAAAA]">
              {hoursInStage}h in current stage
            </span>
          )}
        </span>
      )}
    </span>
  );
}
