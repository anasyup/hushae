import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Check, Cloud, History, Loader2, Monitor, Redo2, Settings2,
  Smartphone, Tablet, Undo2,
} from 'lucide-react';
import { useEditor } from '../core/store';

/* Top bar — device switcher, undo/redo, autosave status, publish. */

export default function Topbar({ onPublish }: { onPublish: () => void }) {
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

  const devBtn = (d: typeof device, Icon: typeof Monitor, label: string) => (
    <button onClick={() => setDevice(d)} title={label} aria-label={label} aria-pressed={device === d}
      className={`grid h-8 w-8 place-items-center rounded-md transition ${
        device === d ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>
      <Icon size={15} />
    </button>
  );

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Link to="/admin/store" title="Back to admin"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900">
          <ArrowLeft size={16} />
        </Link>
        <div className="hidden min-w-0 items-center gap-2 sm:flex">
          <p className="truncate text-[15px] font-semibold text-neutral-900">HUSHAE Theme</p>
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[15px] font-bold uppercase tracking-wider text-emerald-700">
            Live
          </span>
        </div>
      </div>

      <div className="hidden items-center gap-1 rounded-lg bg-neutral-100 p-1 md:flex">
        {devBtn('desktop', Monitor, 'Desktop')}
        {devBtn('tablet', Tablet, 'Tablet')}
        {devBtn('mobile', Smartphone, 'Mobile')}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="mr-1 hidden items-center gap-1.5 text-[15px] text-neutral-500 lg:flex">
          {saving ? <Loader2 size={11} className="animate-spin" /> : dirty ? <Cloud size={11} /> : <Check size={11} className="text-emerald-600" />}
          {savedLabel()}
        </span>

        <button onClick={() => setAutosave(!autosave)} title={autosave ? 'Autosave on' : 'Autosave off'}
          className={`hidden h-8 items-center gap-1.5 rounded-md px-2 text-[15px] font-semibold transition lg:flex ${
            autosave ? 'text-emerald-700 hover:bg-emerald-50' : 'text-neutral-400 hover:bg-neutral-100'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${autosave ? 'bg-emerald-500' : 'bg-neutral-300'}`} /> Auto
        </button>

        <button onClick={() => setShowVersions(!showVersions)} title="Version history" aria-pressed={showVersions}
          className={`grid h-8 w-8 place-items-center rounded-md transition ${
            showVersions ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}>
          <History size={15} />
        </button>
        <button onClick={() => setShowTheme(!showTheme)} title="Theme settings" aria-pressed={showTheme}
          className={`grid h-8 w-8 place-items-center rounded-md transition ${
            showTheme ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}>
          <Settings2 size={15} />
        </button>

        <span className="mx-1 h-6 w-px bg-neutral-200" />

        <button onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)"
          className="grid h-8 w-8 place-items-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30">
          <Undo2 size={15} />
        </button>
        <button onClick={redo} disabled={!future.length} title="Redo (Ctrl+Shift+Z)"
          className="grid h-8 w-8 place-items-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30">
          <Redo2 size={15} />
        </button>

        <button onClick={onPublish} disabled={saving}
          className="ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-[15px] font-semibold text-white transition hover:bg-black disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : null}
          {dirty || saving ? 'Publish' : 'Published'}
        </button>
      </div>
    </header>
  );
}
