import { useState } from 'react';
import { X } from 'lucide-react';
import { useEditor } from '../core/store';

export default function ActivateBanner({ onActivate }: { onActivate: () => Promise<void> | void }) {
  const live = useEditor((s) => s.liveThemed);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (live || dismissed) return null;

  return (
    <div className="flex items-center gap-3 border-b border-[#EAEAEA] bg-white px-4 py-2.5">
      <p className="min-w-0 flex-1 text-[12px] leading-snug text-[#555555]">
        <span className="text-black">Theme not applied yet.</span>{' '}
        Your website currently shows the original coded home page. Click Publish in the top bar to apply this
        theme to the homepage — after that, every change you make here shows on the site.
      </p>
      <button
        onClick={async () => { setBusy(true); await onActivate(); setBusy(false); }}
        disabled={busy}
        className="shrink-0 rounded-[4px] bg-black px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#FFFFFF] disabled:opacity-35"
      >
        {busy ? 'Activating…' : 'Activate editor'}
      </button>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-[#777777] hover:text-black" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
