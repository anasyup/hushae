import { Star } from 'lucide-react';

/* ============================================================================
 * Stars — display only.
 *
 * The row carries a single text alternative ("4.5 out of 5") and the icons are
 * hidden, because a screen reader announcing "star star star star star" five
 * times per review is noise, not information.
 * ========================================================================== */
export default function Stars({ value = 0, size = 14, className = '', label }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role="img" aria-label={label || `${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const full = rounded >= i;
        const half = !full && rounded >= i - 0.5;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }} aria-hidden="true">
            <Star size={size} className="absolute inset-0 text-stone" strokeWidth={1.6} />
            {(full || half) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: half ? size / 2 : size }}>
                <Star size={size} className="fill-sagedeep text-sagedeep" strokeWidth={1.6} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/* ============================================================================
 * Interactive rating input — a real radiogroup.
 *
 * Built from radio inputs rather than buttons so arrow keys work, the group
 * has one tab stop, and a screen reader announces "3 of 5". A row of buttons
 * would give none of that.
 * ========================================================================== */
export function StarInput({ value, onChange, name = 'rating', error }) {
  return (
    <fieldset>
      <legend className="text-body-sm font-medium">
        Your rating <span aria-hidden="true">*</span>
      </legend>
      <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Your rating" aria-invalid={error ? 'true' : undefined}>
        {[1, 2, 3, 4, 5].map((i) => (
          <label
            key={i}
            className="cursor-pointer rounded-full p-1.5 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-obsidian hover:bg-satin/60"
          >
            <input
              type="radio" name={name} value={i} checked={value === i}
              onChange={() => onChange(i)}
              className="sr-only"
            />
            <Star
              size={26}
              strokeWidth={1.6}
              aria-hidden="true"
              className={i <= value ? 'fill-sagedeep text-sagedeep' : 'text-stone'}
            />
            <span className="sr-only">{i} star{i === 1 ? '' : 's'}</span>
          </label>
        ))}
        {value > 0 && <span className="ml-2 text-body-sm text-ash">{value} of 5</span>}
      </div>
    </fieldset>
  );
}
