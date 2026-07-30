import { Minus, Plus } from 'lucide-react';

/**
 * Quantity control shared by the cart, the cart drawer and the product page.
 *
 * Uses <output aria-live="polite"> so a screen reader announces the new count
 * when a button is pressed, instead of leaving the change silent.
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
  // 44px is the WCAG 2.5.5 minimum; the sm variant is only used inside
  // dense cart rows where the row itself is the target.
  const btn = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';

  return (
    <div className="qty" role="group" aria-label={label}>
      <button
        type="button" onClick={dec} disabled={disabled || value <= min}
        className={btn} aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <Minus size={size === 'sm' ? 13 : 15} aria-hidden="true" />
      </button>
      <output aria-live="polite" aria-label={`${label}: ${value}`}>{value}</output>
      <button
        type="button" onClick={inc} disabled={disabled || value >= max}
        className={btn} aria-label={`Increase ${label.toLowerCase()}`}
      >
        <Plus size={size === 'sm' ? 13 : 15} aria-hidden="true" />
      </button>
    </div>
  );
}
