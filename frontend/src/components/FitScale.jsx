import { Ruler } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ============================================================================
 * FitScale — The signature element.
 *
 * In innerwear, fit is the entire purchase decision. Replace S/M/L buttons
 * with a horizontal scale: sizes as ticks along a hairline.
 *
 * When Fit Finder is completed, "YOUR FIT" marker shows calculated size.
 * Aggregate review fit feedback renders as a lighter secondary marker.
 * "This style runs one size small" when the reviews say so.
 * ========================================================================== */

export default function FitScale({ sizes = [], value, onChange, fitData, fitResult, gender = 'women' }) {
  if (!sizes.length) return null;

  const fitSize = fitResult?.size || null;
  const fitWarning = fitResult?.runsSmall ? 'runs small' : fitResult?.runsLarge ? 'runs large' : null;
  const reviewFit = fitData?.reviewFit || null; // aggregate from reviews: { size, count }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-ash">Size</p>
        <div className="flex items-center gap-4 text-[11px]">
          <button type="button" onClick={() => {}} className="text-ash underline underline-offset-4 hover:text-obsidian font-medium uppercase tracking-[0.10em]">
            Size guide
          </button>
          <Link to="/fit-finder" className="inline-flex items-center gap-1 text-obsidian font-medium uppercase tracking-[0.10em] hover:opacity-60">
            <Ruler size={11} /> Fit Finder
          </Link>
        </div>
      </div>

      {/* Fit warning */}
      {fitWarning && (
        <p className="text-[11px] text-ash italic">
          This style {fitWarning} — {fitResult?.suggestion || 'consider sizing accordingly'}.
        </p>
      )}

      {/* The scale — ticks along a hairline */}
      <div className="relative">
        {/* Hairline */}
        <div className="absolute left-0 right-0 top-7 h-px bg-line" />

        {/* Ticks */}
        <div className="relative flex justify-between" style={{ paddingTop: '16px' }}>
          {sizes.map((s) => {
            const selected = value === s;
            const isFit = fitSize === s;
            const hasReviews = reviewFit?.size === s;

            return (
              <button
                key={s}
                type="button"
                onClick={() => onChange?.(s)}
                className="relative flex flex-col items-center"
                aria-pressed={selected}
              >
                {/* Tick mark */}
                <div className="relative">
                  <div
                    className={`h-3 w-px transition-colors ${selected || isFit ? 'bg-obsidian' : 'bg-line'}`}
                  />
                  {/* Selected dot */}
                  {selected && (
                    <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 h-[9px] w-[9px] rounded-full bg-obsidian" />
                  )}
                  {/* Fit Finder marker */}
                  {isFit && !selected && (
                    <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 h-[7px] w-[7px] rounded-full border border-obsidian bg-white" />
                  )}
                  {/* Review aggregate marker */}
                  {hasReviews && !selected && !isFit && (
                    <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 h-[4px] w-[4px] rounded-full bg-ash" />
                  )}
                </div>

                {/* Size label */}
                <span className={`mt-3 text-[12px] font-medium tabular-nums transition-colors ${selected ? 'text-obsidian' : 'text-ash'}`}>
                  {s}
                </span>

                {/* YOUR FIT label */}
                {isFit && (
                  <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.12em] text-obsidian whitespace-nowrap">
                    Your fit
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected size text */}
      {value && (
        <p className="text-[11px] text-obsidian">
          Selected: <span className="font-medium">{value}</span>
          {fitWarning && <span className="ml-2 text-ash">({fitWarning})</span>}
        </p>
      )}

      {/* No selection hint */}
      {!value && (
        <p className="text-[11px] text-ash">Please select a size</p>
      )}
    </div>
  );
}
