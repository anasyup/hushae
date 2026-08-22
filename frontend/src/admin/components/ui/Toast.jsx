/* ============================================================================
 * Admin UI — Toast (context + viewport)
 * Muted semantic tones: success / error / warning / info. Icon + message,
 * auto-dismiss (4s), manual close, aria-live polite region.
 * Phase 01 provides the system; pages adopt it in later phases.
 * ========================================================================== */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

const meta = {
  success: { icon: CheckCircle2, cls: 'text-admin-success', label: 'Success' },
  error: { icon: XCircle, cls: 'text-admin-danger', label: 'Error' },
  warning: { icon: AlertTriangle, cls: 'text-admin-warning', label: 'Warning' },
  info: { icon: Info, cls: 'text-admin-info', label: 'Info' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'info', timeout = 4000) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 7);
    setToasts((t) => [...t, { id, message, type }]);
    if (timeout > 0) {
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), timeout);
    }
    return id;
  }, []);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const api = useMemo(
    () => ({
      toast: push,
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      warning: (m) => push(m, 'warning'),
      info: (m) => push(m, 'info'),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[340px] max-w-[calc(100vw-40px)] flex-col gap-2"
      >
        {toasts.map((t) => {
          const M = meta[t.type];
          const Icon = M.icon;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-admin-border bg-admin-surface-3 px-3.5 py-3 shadow-md"
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${M.cls}`} />
              <p className="min-w-0 flex-1 text-[13px] leading-snug text-admin-text">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-admin-text-muted transition hover:bg-admin-surface-2 hover:text-admin-text"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
