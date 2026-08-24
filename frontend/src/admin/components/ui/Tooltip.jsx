/* ============================================================================
 * Admin UI — Tooltip
 * CSS-only tooltip on hover + focus (keyboard accessible).
 * ========================================================================== */

export default function Tooltip({ label, children, side = 'top' }) {
  const pos =
    side === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-1.5'
      : side === 'bottom'
      ? 'top-full left-1/2 -translate-x-1/2 mt-1.5'
      : side === 'right'
      ? 'left-full top-1/2 -translate-y-1/2 ml-1.5'
      : 'right-full top-1/2 -translate-y-1/2 mr-1.5';

  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-[4px] border border-[#EAEAEA] bg-[#0D0D0D] px-2 py-1 text-[11px] text-black opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ${pos}`}
      >
        {label}
      </span>
    </span>
  );
}
