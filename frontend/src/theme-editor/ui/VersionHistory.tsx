import { useState } from 'react';
import { Clock, History, RotateCcw, X } from 'lucide-react';
import { useEditor } from '../core/store';
import type { ThemeVersion } from '../core/types';

/* Version drawer — list, preview and restore saved snapshots. */

export default function VersionHistory({ onPreview }: { onPreview: (v: ThemeVersion | null) => void }) {
  const show = useEditor((s) => s.showVersions);
  const setShow = useEditor((s) => s.setShowVersions);
  const versions = useEditor((s) => s.versions);
  const restore = useEditor((s) => s.restoreVersion);
  const past = useEditor((s) => s.past);
  const [previewing, setPreviewing] = useState<string | null>(null);

  if (!show) return null;

  const when = (iso: string) => {
    const d = new Date(iso);
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-3">
        <History size={15} className="text-neutral-500" />
        <p className="flex-1 text-[15px] font-semibold text-neutral-900">Version history</p>
        <button onClick={() => { setShow(false); onPreview(null); setPreviewing(null); }}
          className="grid h-7 w-7 place-items-center rounded text-neutral-500 hover:bg-neutral-100"><X size={14} /></button>
      </div>

      <div className="te-scroll flex-1 overflow-y-auto p-2.5">
        {versions.length === 0 && (
          <p className="p-6 text-center text-xs leading-relaxed text-neutral-400">
            No saved versions yet.<br />A version is captured every time you publish.
          </p>
        )}

        {versions.map((v) => (
          <div key={v._id}
            className={`mb-1.5 rounded-lg border p-3 transition ${previewing === v._id ? 'border-[#FFFFFF] bg-[#FFFFFF]/5' : 'border-neutral-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium text-neutral-900">{v.label}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[15px] text-neutral-400">
                  <Clock size={10} /> {when(v.createdAt)}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex gap-1.5">
              <button
                onClick={() => {
                  const next = previewing === v._id ? null : v;
                  setPreviewing(next?._id || null);
                  onPreview(next);
                }}
                className="flex-1 rounded-md border border-neutral-300 py-1.5 text-[15px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
                {previewing === v._id ? 'Stop preview' : 'Preview'}
              </button>
              <button
                onClick={() => { if (confirm(`Restore “${v.label}”? Current unsaved work stays in undo history.`)) { restore(v); onPreview(null); setPreviewing(null); } }}
                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-neutral-900 py-1.5 text-[15px] font-semibold text-white transition hover:bg-black">
                <RotateCcw size={11} /> Restore
              </button>
            </div>
          </div>
        ))}

        {past.length > 0 && (
          <>
            <p className="mb-1.5 mt-4 px-1 text-[15px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              This session
            </p>
            <div className="space-y-0.5">
              {past.slice(-25).reverse().map((h, i) => (
                <div key={i} className="flex items-center gap-2 rounded px-2 py-1.5 text-[13.5px] text-neutral-500">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                  <span className="flex-1 truncate">{h.label}</span>
                  <span className="shrink-0 text-[15px] text-neutral-400">
                    {new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
