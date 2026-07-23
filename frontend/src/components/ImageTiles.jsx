import { useRef, useState } from 'react';
import { Link2, Loader2, Plus, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { smartUpload } from '../lib/upload';
import Img from './Img';

// Visual image picker — preview tiles + dashed add-tile, drag to reorder, click cross to delete
export default function ImageTiles({ images, onChange, min = 4 }) {
  const { settings, auth, toast } = useApp();
  const media = settings?.media || {};
  const [busy, setBusy] = useState(0);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState('');
  const [drag, setDrag] = useState(null);
  const fileRef = useRef(null);

  const addUrls = (arr) => onChange([...images, ...arr.filter((u) => u && !images.includes(u))]);

  const upload = async (files) => {
    if (!files.length) return;
    setBusy(files.length);
    const done = [];
    for (const file of files) {
      try {
        done.push(await smartUpload(file, { media, token: auth?.token }));
      } catch (ex) { toast(ex.message || 'Ek file upload nahi hui'); }
      setBusy((n) => n - 1);
    }
    if (done.length) addUrls(done);
    if (fileRef.current) fileRef.current.value = '';
  };

  const move = (from, to) => {
    if (from === null || from === to) return;
    const next = [...images];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };

  const addLink = () => {
    const u = link.trim();
    if (!u) return;
    addUrls([u]);
    setLink('');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {images.map((url, i) => (
          <div key={`${url}-${i}`} draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); move(drag, i); setDrag(null); }}
            onDragEnd={() => setDrag(null)}
            className={`group relative h-28 w-[5.5rem] cursor-grab overflow-hidden rounded-xl border-2 bg-satin/40 transition ${i === 0 ? 'border-obsidian' : 'border-line'} ${drag === i ? 'opacity-40' : ''}`}
            title="Drag to reorder">
            <Img src={url} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 rounded-md bg-obsidian px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-alabaster">Main</span>}
            <button type="button" aria-label="Remove" onClick={() => onChange(images.filter((_, x) => x !== i))}
              className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-bl-lg bg-obsidian/85 text-alabaster opacity-0 transition hover:bg-red-700 group-hover:opacity-100">
              <X size={12} />
            </button>
          </div>
        ))}
        {busy > 0 && (
          <div className="flex h-28 w-[5.5rem] items-center justify-center rounded-xl border border-line bg-satin/50">
            <Loader2 size={18} className="animate-spin text-ash" />
          </div>
        )}
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex h-28 w-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-ash transition hover:border-obsidian hover:text-obsidian">
          <Plus size={22} />
          <span className="text-[10px] font-medium leading-tight">PC se<br />upload</span>
        </button>
        <button type="button" onClick={() => setShowLink((v) => !v)}
          className={`flex h-28 w-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition ${showLink ? 'border-obsidian text-obsidian' : 'border-line text-ash hover:border-obsidian hover:text-obsidian'}`}>
          <Link2 size={18} />
          <span className="text-[10px] font-medium leading-tight">Link<br />se</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload([...e.target.files])} />
      </div>

      {showLink && (
        <div className="mt-3 flex gap-2">
          <input className="input flex-1 !py-2.5 font-mono text-xs" placeholder="https://example.com/photo.jpg" value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} />
          <button type="button" className="btn-outline shrink-0 !py-2.5" onClick={addLink}>Add</button>
        </div>
      )}

      <p className="mt-2.5 text-[11px] leading-relaxed text-ash">
        Minimum {min} images · pehli tile <b className="text-obsidian">Main photo</b> hai · tiles pakar kar <b className="text-obsidian">drag</b> karo aur order badlo · cross (✕) se delete.
      </p>
    </div>
  );
}
