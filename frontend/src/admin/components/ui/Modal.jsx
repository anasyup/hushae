/* ============================================================================
 * Admin UI — Modal (Phase 03-R)
 * Sharp 8px radius (max of the scale), flat black, hairline border.
 * Esc / backdrop close, focus management, scroll lock.
 * ========================================================================== */

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 560,
  dismissable = true,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissable) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, dismissable, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70" onClick={dismissable ? onClose : undefined} />
      <div
        ref={ref}
        tabIndex={-1}
        style={{ maxWidth: width }}
        className="relative w-full rounded-lg border border-white/15 bg-[#0A0A0A] shadow-none outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/50">{title}</h2>
            {description && <p className="mt-1 text-[12px] text-white/40">{description}</p>}
          </div>
          {dismissable && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="grid h-8 w-8 shrink-0 place-items-center text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
