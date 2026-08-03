import { X } from 'lucide-react';

/* Shows what is currently narrowing the results, and lets each one go
 * individually. Without this the only way to undo a filter was to find the
 * control again in the rail — and on mobile that meant reopening the sheet. */
export default function ActiveChips({ chips, onRemove, onClearAll, className = '' }) {
  if (!chips.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="sr-only" aria-live="polite">{chips.length} filter{chips.length === 1 ? '' : 's'} applied</span>

      {chips.map((c) => (
        <button
          key={`${c.key}:${c.value}`}
          type="button"
          onClick={() => onRemove(c)}
          aria-label={`Remove filter ${c.label}`}
          className="group inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-line bg-white/70 pl-3.5 pr-2.5 text-caption font-semibold capitalize text-ink transition-colors duration-fast hover:border-obsidian/40 hover:text-obsidian"
        >
          {c.label}
          <X size={12} strokeWidth={2.4} aria-hidden="true" className="text-ash transition-colors duration-fast group-hover:text-obsidian" />
        </button>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="min-h-[34px] px-1.5 text-caption font-semibold text-ash underline underline-offset-4 transition-colors duration-fast hover:text-obsidian"
      >
        Clear all
      </button>
    </div>
  );
}
