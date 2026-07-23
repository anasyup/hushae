import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImagePlus, Link2, Loader2 } from 'lucide-react';
import { useApp } from '../store/AppContext';

// Upload button + URL input — uploads go straight from browser to the store's media library (Cloudinary)
export default function MediaPicker({ value = '', onChange, onAdd, multiple = false, accept = 'image', hideUrl = false, buttonText = 'PC se upload' }) {
  const { settings, toast } = useApp();
  const media = settings?.media || {};
  const ready = !!(media.cloudName && media.uploadPreset);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const upload = async (files) => {
    if (!ready || !files.length) { if (!ready) toast('Pehle Apps page par Media Library connect karein'); return; }
    setBusy(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', media.uploadPreset);
        const r = await fetch(`https://api.cloudinary.com/v1_1/${media.cloudName}/auto/upload`, { method: 'POST', body: fd });
        const d = await r.json();
        if (!d.secure_url) throw new Error(d.error?.message || 'Upload failed');
        if (onAdd) onAdd(d.secure_url);
        else onChange?.(d.secure_url);
      }
      toast(files.length > 1 ? `${files.length} files upload ho gayein` : 'Upload ho gaya');
    } catch (ex) {
      toast(ex.message || 'Upload failed — Apps page par Media Library settings check karein');
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const acceptStr = accept === 'video' ? 'video/*' : accept === 'any' ? 'image/*,video/*' : 'image/*';

  return (
    <div>
      <div className="flex gap-2">
        <input ref={inputRef} type="file" accept={acceptStr} multiple={multiple} className="hidden" onChange={(e) => upload([...e.target.files])} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy || !ready}
          className="btn-outline shrink-0 whitespace-nowrap" title={ready ? '' : 'Pehle Apps → Media Library connect karein'}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {busy ? 'Upload ho raha hai…' : buttonText}
        </button>
        {!hideUrl && (
          <span className="relative flex-1">
            <Link2 size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
            <input className="input !pl-9" placeholder="ya link paste karein…" value={value} onChange={(e) => onChange?.(e.target.value)} />
          </span>
        )}
      </div>
      {!ready && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ash">
          PC se upload abhi off hai — <Link className="font-semibold underline" to="/admin/apps">Apps → Media Library</Link> mein Cloudinary connect karein (5 minute, free).
        </p>
      )}
      {accept === 'image' && !hideUrl && value ? (
        <img src={value} alt="" className="mt-2 h-20 w-20 rounded-xl border border-line object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
      ) : null}
      {accept === 'video' && value ? (
        <video src={value} className="mt-2 h-24 rounded-xl border border-line object-cover" muted loop autoPlay playsInline />
      ) : null}
    </div>
  );
}
