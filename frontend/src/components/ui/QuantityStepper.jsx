import { Minus, Plus } from 'lucide-react';

/**
 * Quantity control shared by the cart, the cart drawer and the product page.
 *
 * QA — Quiet Architecture: a minimal "- 1 +" with thin clay borders and no
 * background. Uses <output aria-live="polite"> so a screen reader announces
 * the new count when a button is pressed.
 */
export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  label = 'Quantity',
  disabled = false,
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const icon = size === 'sm' ? 11 : 12;

  return (
    <div className="inline-flex items-center border border-clay" role="group" aria-label={label}>
      <button
        type="button" onClick={dec} disabled={disabled || value <= min}
        className="grid h-8 w-9 place-items-center text-smoke transition-colors duration-fast hover:text-charcoal disabled:pointer-events-none disabled:text-smoke/30"
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <Minus size={icon} aria-hidden="true" />
      </button>
      <output aria-live="polite" aria-label={`${label}: ${value}`}
        className="min-w-7 px-1 text-center text-[13px] font-medium tabular-nums text-charcoal">
        {value}
      </output>
      <button
        type="button" onClick={inc} disabled={disabled || value >= max}
        className="grid h-8 w-9 place-items-center text-smoke transition-colors duration-fast hover:text-charcoal disabled:pointer-events-none disabled:text-smoke/30"
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <Plus size={icon} aria-hidden="true" />
      </button>
    </div>
  );
}
