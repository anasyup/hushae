import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Check, Cloud, ExternalLink, History, Loader2, Monitor, Redo2, Settings2,
  Smartphone, Tablet, Undo2,
} from 'lucide-react';
import { useEditor } from '../core/store';

/* Top bar — device switcher, undo/redo, autosave status, publish. */

export default function Topbar({ onSave, onPublish }: { onSave?: () => void; onPublish: () => void }) {
  const device = useEditor((s) => s.device);
  const setDevice = useEditor((s) => s.setDevice);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const past = useEditor((s) => s.past);
  const future = useEditor((s) => s.future);
  const dirty = useEditor((s) => s.dirty);
  const saving = useEditor((s) => s.saving);
  const lastSavedAt = useEditor((s) => s.lastSavedAt);
  const autosave = useEditor((s) => s.autosave);
  const setAutosave = useEditor((s) => s.setAutosave);
  const setShowVersions = useEditor((s) => s.setShowVersions);
  const showVersions = useEditor((s) => s.showVersions);
  const setShowTheme = useEditor((s) => s.setShowThemeSettings);
  const showTheme = useEditor((s) => s.showThemeSettings);

  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 20000);
    return () => clearInterval(t);
  }, []);

  const savedLabel = () => {
    if (saving) return 'Saving…';
    if (dirty) return autosave ? 'Unsaved' : 'Unsaved changes';
    if (!lastSavedAt) return 'Saved';
    const mins = Math.round((Date.now() - lastSavedAt) / 60000);
    return mins < 1 ? 'Saved just now' : `Saved ${mins} min ago`;
  };

  const iconBtn = (active?: boolean) =>
    `grid h-8 w-8 place-items-center rounded-[4px] transition ${
      active ? 'bg-black text-[#FFFFFF]' : 'text-[#777777] hover:bg-[#F5F5F5] hover:text-black'
    }`;

  const devBtn = (d: typeof device, Icon: typeof Monitor, label: string) => (
    <button onClick={() => setDevice(d)} title={label} aria-label={label} aria-pressed={device === d}
      className={iconBtn(device === d)}>
      <Icon size={15} />
    </button>
  );

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Link to="/admin/store" title="Back to admin"
          className={iconBtn()}>
          <ArrowLeft size={16} />
        </Link>
        <div className="hidden min-w-0 items-center gap-2 sm:flex">
          <p className="truncate text-[13px] font-medium tracking-tight text-black">HUSHAE Theme</p>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#777777]">
            {dirty ? '● DRAFT' : '● LIVE'}
          </span>
        </div>
      </div>

      <div className="hidden items-center gap-1 border border-[#EAEAEA] p-0.5 md:flex">
        {devBtn('desktop', Monitor, 'Desktop')}
        {devBtn('tablet', Tablet, 'Tablet')}
        {devBtn('mobile', Smartphone, 'Mobile')}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="mr-1 hidden items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[#777777] lg:flex">
          {saving ? <Loader2 size={11} className="animate-spin" /> : dirty ? <Cloud size={11} /> : <Check size={11} />}
          {savedLabel()}
        </span>

        <button onClick={() => setAutosave(!autosave)} title={autosave ? 'Autosave on' : 'Autosave off'}
          className="hidden h-8 items-center gap-1.5 rounded-[4px] px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#777777] transition hover:text-black lg:flex">
          <span className={`h-1 w-1 rounded-full ${autosave ? 'bg-black' : 'bg-[#D8D8D8]'}`} /> Auto
        </button>

        <button onClick={() => setShowVersions(!showVersions)} title="Version history" aria-pressed={showVersions}
          className={iconBtn(showVersions)}>
          <History size={15} />
        </button>
        <button onClick={() => setShowTheme(!showTheme)} title="Theme settings" aria-pressed={showTheme}
          className={iconBtn(showTheme)}>
          <Settings2 size={15} />
        </button>

        <span className="mx-1 h-6 w-px bg-[#EAEAEA]" />

        <button onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)"
          className={`${iconBtn()} disabled:opacity-25`}>
          <Undo2 size={15} />
        </button>
        <button onClick={redo} disabled={!future.length} title="Redo (Ctrl+Shift+Z)"
          className={`${iconBtn()} disabled:opacity-25`}>
          <Redo2 size={15} />
        </button>

        {onSave && (
          <button onClick={onSave} disabled={saving}
            className="ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[#D8D8D8] px-3 text-[10px] font-medium uppercase tracking-[0.08em] text-black transition hover:border-black disabled:opacity-35">
            Save
          </button>
        )}
        <button onClick={onPublish} disabled={saving}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-black px-4 text-[10px] font-medium uppercase tracking-[0.08em] text-[#FFFFFF] transition hover:bg-black/80 disabled:opacity-35">
          {saving ? <Loader2 size={13} className="animate-spin" /> : null}
          {dirty || saving ? 'Publish' : 'Published'}
        </button>
        <a href="/" target="_blank" rel="noreferrer" title="View live site"
          className={iconBtn()}>
          <ExternalLink size={14} />
        </a>
      </div>
    </header>
  );
}
