import { useState } from 'react';
import { Rocket, X } from 'lucide-react';
import { useEditor } from '../core/store';

/* ============================================================================
 * Shown while the storefront is still rendering the original hand-coded home
 * page. One click publishes the current document and hands control of the
 * home page to the editor — permanently, and reversibly.
 * ========================================================================== */

export default function ActivateBanner({ onActivate }: { onActivate: () => Promise<void> | void }) {
  const live = useEditor((s) => s.liveThemed);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (live || dismissed) return null;

  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
      <Rocket size={15} className="shrink-0 text-amber-600" />
      <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-amber-900">
        <span className="font-semibold">Editor not live yet.</span>{' '}
        Your website still shows the original coded home page. Publish once to hand the home page over to this editor —
        after that every change is made here, never in code.
      </p>
      <button
        onClick={async () => { setBusy(true); await onActivate(); setBusy(false); }}
        disabled={busy}
        className="shrink-0 rounded-md bg-amber-600 px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
      >
        {busy ? 'Activating…' : 'Activate editor'}
      </button>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-amber-500 hover:text-amber-800" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
