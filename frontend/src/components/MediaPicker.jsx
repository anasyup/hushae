import { useRef, useState } from 'react';
import { ImagePlus, Link2, Loader2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { smartUpload } from '../lib/upload';

// Upload button + URL input — + click opens the PC file dialog immediately
export default function MediaPicker({ value = '', onChange, onAdd, multiple = false, accept = 'image', hideUrl = false, buttonText = 'PC se upload' }) {
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
      if (n) toast(n > 1 ? `${n} files upload ho gayein` : 'Upload ho gaya');
    } catch (ex) {
      toast(ex.message || 'Upload nahi hui');
    }
    setBusy(false); setPct(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const acceptStr = accept === 'video' ? 'video/*' : accept === 'any' ? 'image/*,video/*' : 'image/*';

  return (
    <div>
      <div className="flex gap-2">
        <input ref={inputRef} type="file" accept={acceptStr} multiple={multiple} className="hidden" onChange={(e) => upload([...e.target.files])} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          className="btn-outline shrink-0 whitespace-nowrap">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {busy ? (pct !== null ? `Upload ${pct}%…` : 'Upload ho raha hai…') : buttonText}
        </button>
        {!hideUrl && (
          <span className="relative flex-1">
            <Link2 size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
            <input className="input !pl-9" placeholder="ya link paste karein…" value={value} onChange={(e) => onChange?.(e.target.value)} />
          </span>
        )}
      </div>
      {accept === 'image' && !hideUrl && value ? (
        <img src={value} alt="" className="mt-2 h-20 w-20 rounded-xl border border-line object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
      ) : null}
      {accept === 'video' && value ? (
        <video src={value} className="mt-2 h-24 rounded-xl border border-line object-cover" muted loop autoPlay playsInline />
      ) : null}
    </div>
  );
}
