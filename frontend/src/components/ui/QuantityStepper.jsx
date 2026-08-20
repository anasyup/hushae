import { Minus, Plus } from 'lucide-react';

/* ============================================================================
 * HUSHAE QuantityStepper — Soft-Rounded Luxury Pill Stepper
 * ========================================================================== */
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
  const iconSize = size === 'sm' ? 10 : 12;
  const isSm = size === 'sm';

  return (
    <div
      className={`inline-flex items-center rounded-full border border-[#E0E0E0] bg-[#FFFFFF] transition-colors hover:border-[#000000] ${
        isSm ? 'px-1 py-0.5' : 'px-1.5 py-1'
      }`}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        className={`grid place-items-center text-neutral-500 hover:text-black transition-colors disabled:opacity-30 disabled:hover:text-neutral-500 ${
          isSm ? 'h-6 w-6' : 'h-7 w-7'
        }`}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <Minus size={iconSize} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <output
        aria-live="polite"
        aria-label={`${label}: ${value}`}
        className={`text-center font-medium tabular-nums text-[#000000] ${
          isSm ? 'min-w-[20px] text-xs' : 'min-w-[24px] text-[13px]'
        }`}
      >
        {value}
      </output>

      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        className={`grid place-items-center text-neutral-500 hover:text-black transition-colors disabled:opacity-30 disabled:hover:text-neutral-500 ${
          isSm ? 'h-6 w-6' : 'h-7 w-7'
        }`}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <Plus size={iconSize} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}
