import { useRef, useState } from 'react';
import { Film, Link2, Loader2, Play, Plus, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { smartUpload } from '../lib/upload';
import { isVideo, isVideoFile, ytId } from '../lib/media';
import Img from './Img';

// Visual media picker — photo + video tiles side by side.
// Click a tile = make it Main (2-tile swap) · drag = 2-tile swap · ✕ = delete
export default function ImageTiles({ images, onChange, min = 4 }) {
  const { settings, auth, toast } = useApp();
  const media = settings?.media || {};
  const [busy, setBusy] = useState(0);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState('');
  const [drag, setDrag] = useState(null);
  const fileRef = useRef(null);
  const vidRef = useRef(null);

  const addUrls = (arr) => onChange([...images, ...arr.filter((u) => u && !images.includes(u))]);

  const upload = async (files, ref) => {
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
    if (ref?.current) ref.current.value = '';
  };

  // Drag tile A onto tile B → ONLY those two swap places (no stack shifting).
  const move = (from, to) => {
    if (from === null || from === to) return;
    const next = [...images];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  // Click a tile → it becomes Main (position 0). Only the two tiles swap places —
  // everything else stays exactly where it was (no stack shifting).
  const setMain = (i) => {
    if (i === 0) return;
    const next = [...images];
    [next[0], next[i]] = [next[i], next[0]];
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
        {images.map((url, i) => {
          const vid = isVideo(url);
          const fileVid = vid && isVideoFile(url);
          const yt = vid ? ytId(url) : null;
          return (
            <div key={`${url}-${i}`} draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); move(drag, i); setDrag(null); }}
              onDragEnd={() => setDrag(null)}
              className={`group relative h-28 w-[5.5rem] cursor-grab overflow-hidden rounded-xl border-2 bg-satin/40 transition ${i === 0 ? 'border-obsidian' : 'border-line'} ${drag === i ? 'opacity-40' : ''}`}
              title={i === 0 ? 'Main media' : 'Click = Main banao · Drag = do tiles swap hongi'}>
              {fileVid ? (
                <video src={url} muted loop autoPlay playsInline preload="metadata" onClick={() => setMain(i)}
                  className={`h-full w-full object-cover ${i === 0 ? '' : 'cursor-pointer'}`} />
              ) : yt ? (
                <div onClick={() => setMain(i)} className={`relative h-full w-full ${i === 0 ? '' : 'cursor-pointer'}`}>
                  <img src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-80" />
                  <span className="absolute inset-0 flex items-center justify-center bg-obsidian/25 text-alabaster"><Play size={20} fill="currentColor" /></span>
                </div>
              ) : (
                <Img src={url} alt="" onClick={() => setMain(i)}
                  className={`h-full w-full object-cover ${i === 0 ? '' : 'cursor-pointer'}`} />
              )}
              {i === 0 && <span className="absolute left-1 top-1 rounded-md bg-obsidian px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-alabaster">Main</span>}
              {vid && <span className="pointer-events-none absolute right-8 top-1 rounded-md bg-obsidian/85 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-alabaster">Video</span>}
              {i !== 0 && (
                <span className="pointer-events-none absolute inset-x-1 bottom-1 rounded-md bg-obsidian/80 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-alabaster opacity-0 transition group-hover:opacity-100">
                  Set Main
                </span>
              )}
              <button type="button" aria-label="Remove" onClick={() => onChange(images.filter((_, x) => x !== i))}
                className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-bl-lg bg-obsidian/85 text-alabaster opacity-0 transition hover:bg-red-700 group-hover:opacity-100">
                <X size={12} />
              </button>
            </div>
          );
        })}
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
        <button type="button" onClick={() => vidRef.current?.click()}
          className="flex h-28 w-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-ash transition hover:border-obsidian hover:text-obsidian">
          <Film size={20} />
          <span className="text-[10px] font-medium leading-tight">Video<br />add</span>
        </button>
        <button type="button" onClick={() => setShowLink((v) => !v)}
          className={`flex h-28 w-[5.5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition ${showLink ? 'border-obsidian text-obsidian' : 'border-line text-ash hover:border-obsidian hover:text-obsidian'}`}>
          <Link2 size={18} />
          <span className="text-[10px] font-medium leading-tight">Link<br />se</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload([...e.target.files], fileRef)} />
        <input ref={vidRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => upload([...e.target.files], vidRef)} />
      </div>

      {showLink && (
        <div className="mt-3 flex gap-2">
          <input className="input flex-1 !py-2.5 font-mono text-xs" placeholder="Photo URL ya YouTube/video link" value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} />
          <button type="button" className="btn-outline shrink-0 !py-2.5" onClick={addLink}>Add</button>
        </div>
      )}

      <p className="mt-2.5 text-[11px] leading-relaxed text-ash">
        Minimum {min} media (photos + videos mil kar) · pehli tile <b className="text-obsidian">Main</b> hai · kisi tile par <b className="text-obsidian">click</b> karo = wo Main ban jayegi (baqi apni jagah rahengi) · <b className="text-obsidian">drag</b> karke kisi tile par chhodo = sirf wo <b className="text-obsidian">do tiles swap</b> hongi · <b className="text-obsidian">Video add</b> se MP4 clip bhi yahi tile banegi — product page ki gallery mein yahi order dikhega · cross (✕) se delete.
      </p>
    </div>
  );
}
