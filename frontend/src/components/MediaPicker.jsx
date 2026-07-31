import { useId, useRef, useState } from 'react';
import { ImagePlus, Link2, Loader2, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { smartUpload } from '../lib/upload';

// Upload button + URL input — click opens PC file dialog immediately
// Now with a "clear/delete" button that appears when a value exists.
export default function MediaPicker({ value = '', onChange, onAdd, multiple = false, accept = 'image', hideUrl = false, buttonText = 'Upload from PC', label = 'Or paste a picture link' }) {
  /* MEASURED, Sprint 2L P2B: the URL box was a bare <input> with only a
     placeholder. A placeholder is not a label — it disappears the moment you
     type and screen readers announce "edit text, blank". LIVE /admin/content
     reported 15 unlabelled inputs on commit 31dc133, so this is pre-existing
     and fixing it here repairs Collections, Content and ThemeEditor too. */
  const urlId = useId();
  const { settings, auth, toast } = useApp();
  const media = settings?.media || {};
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(null);
  const inputRef = useRef(null);

  const upload = async (files) => {
    if (!files.length) return;
    setBusy(true); setPct(null);
    let n = 0;
    try {
      for (const file of files) {
        const url = await smartUpload(file, { media, token: auth?.token, onProgress: setPct });
        if (onAdd) onAdd(url);
        else onChange?.(url);
        n += 1;
      }
      if (n) toast(n > 1 ? `${n} files uploaded` : 'Upload complete');
    } catch (ex) {
      toast(ex.message || 'Upload failed');
    }
    setBusy(false); setPct(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const clear = () => {
    onChange?.('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const acceptStr = accept === 'video' ? 'video/*' : accept === 'any' ? 'image/*,video/*' : 'image/*';

  return (
    <div>
      <div className="flex gap-2">
        <input ref={inputRef} type="file" accept={acceptStr} multiple={multiple} className="hidden" onChange={(e) => upload([...e.target.files])} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          className="btn-outline shrink-0 whitespace-nowrap">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {busy ? (pct !== null ? `Uploading ${pct}%…` : 'Uploading…') : buttonText}
        </button>
        {!hideUrl && (
          <span className="relative flex-1">
            <Link2 size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
            <label className="sr-only" htmlFor={urlId}>{label}</label>
            <input id={urlId} className="input !pl-9" placeholder="or paste a link…" value={value} onChange={(e) => onChange?.(e.target.value)} />
          </span>
        )}
      </div>

      {/* Preview + delete button */}
      {value ? (
        <div className="mt-3 flex items-center gap-3">
          {accept === 'image' ? (
            <img src={value} alt="" className="h-20 w-20 rounded-xl border border-line object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
          ) : accept === 'video' ? (
            <video src={value} className="h-20 w-32 rounded-xl border border-line object-cover" muted loop autoPlay playsInline />
          ) : null}
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-100 hover:border-red-300"
            title="Remove this file"
          >
            <X size={12} /> Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
