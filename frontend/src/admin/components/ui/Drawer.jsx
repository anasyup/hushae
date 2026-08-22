/* ============================================================================
 * Admin UI — Drawer (right side, 400–520px)
 * Surface #111113, subtle border, 12px radius on the leading edge.
 * Esc / backdrop close, body scroll locked, focus into panel.
 * ========================================================================== */

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Drawer({ open, onClose, title, description, children, footer, width = 460 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        style={{ width }}
        className="absolute inset-y-0 right-0 flex w-full max-w-[100vw] flex-col rounded-l-xl border-l border-admin-border bg-admin-surface shadow-lg outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-admin-border-subtle px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-admin-text">{title}</h2>
            {description && <p className="mt-0.5 text-[12px] text-admin-text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-admin-text-muted transition hover:bg-admin-surface-2 hover:text-admin-text"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-admin-border-subtle px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
