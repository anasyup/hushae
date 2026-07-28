import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { useEditor } from './core/store';
import { buildDefaultDoc } from './schemas/defaultDoc';
import { themeDefaults } from './schemas/theme';
import { diffDocs } from './core/docUtils';
import Topbar from './ui/Topbar';
import SectionTree from './ui/SectionTree';
import Inspector from './ui/Inspector';
import PreviewFrame from './ui/PreviewFrame';
import { AddBlockPanel, AddSectionPanel } from './ui/AddPanel';
import VersionHistory from './ui/VersionHistory';
import type { ThemeVersion } from './core/types';
import { api } from '../api/client';
import { invalidateThemeDoc } from './useThemeDoc';
import { useApp } from '../store/AppContext';
import './editor.css';

/* ============================================================================
 * Theme Editor shell — three panels, autosave, keyboard shortcuts.
 * ========================================================================== */

const AUTOSAVE_MS = 2500;

export default function ThemeEditorApp() {
  const { auth, toast } = useApp() as any;
  const store = useEditor();
  const {
    doc, theme, loading, dirty, autosave, hydrate, markSaved, setSaving,
    undo, redo, selectedId, remove, duplicate, select, sidebarQuery, setSidebarQuery,
    setVersions, setShowVersions,
  } = store;

  const [previewVersion, setPreviewVersion] = useState<ThemeVersion | null>(null);
  const savedRef = useRef<{ doc: typeof doc; theme: typeof theme } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    api('/theme')
      .then((d: any) => {
        if (!alive) return;
        const loaded = d?.theme?.doc?.body?.length ? d.theme.doc : buildDefaultDoc();
        const t = { ...themeDefaults(), ...(d?.theme?.settings || {}) };
        hydrate(loaded, t, d?.versions || []);
      })
      .catch(() => { if (alive) hydrate(buildDefaultDoc(), themeDefaults(), []); });
    return () => { alive = false; };
  }, [hydrate]);

  // ── Save ────────────────────────────────────────────────────────────────
  const save = useCallback(async (publish = false) => {
    const state = useEditor.getState();
    const prev = savedRef.current;
    const changed = prev ? diffDocs(prev.doc, state.doc) : null;
    setSaving(true);
    try {
      const res: any = await api('/theme', {
        method: 'PUT',
        token: auth?.token,
        body: {
          doc: state.doc,
          settings: state.theme,
          publish,
          // Incremental hint — the server stores the full doc but logs the delta
          changedNodes: changed ? [...changed.changed, ...changed.added] : undefined,
          removedNodes: changed?.removed,
        },
      });
      savedRef.current = { doc: state.doc, theme: state.theme };
      markSaved(state.doc, state.theme);
      if (res?.versions) setVersions(res.versions);
      if (publish) {
        invalidateThemeDoc();   // storefront picks up the new document on next load
        toast?.('Theme published — live on the website');
      }
    } catch (e: any) {
      setSaving(false);
      toast?.(e?.message || 'Could not save');
    }
  }, [auth?.token, markSaved, setSaving, setVersions, toast]);

  // ── Autosave ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !dirty || !autosave) return undefined;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(false), AUTOSAVE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [doc, theme, dirty, autosave, loading, save]);

  // Warn on unload with unsaved work
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (useEditor.getState().dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  // ── Keyboard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(true); return; }
      if (typing) return;
      if (mod && e.key.toLowerCase() === 'd' && selectedId) { e.preventDefault(); duplicate(selectedId); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); remove(selectedId); return; }
      if (e.key === 'Escape') select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, save, selectedId, duplicate, remove, select]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-neutral-100">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 size={16} className="animate-spin" /> Loading theme…
        </div>
      </div>
    );
  }

  return (
    <div className="te-shell fixed inset-0 z-50 flex flex-col bg-neutral-100">
      <Topbar onPublish={() => save(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT */}
        <aside className="relative flex w-[290px] shrink-0 flex-col border-r border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-3 py-2.5">
            <div className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1.5">
              <Search size={12} className="shrink-0 text-neutral-400" />
              <input value={sidebarQuery} onChange={(e) => setSidebarQuery(e.target.value)}
                placeholder="Search sections and blocks" className="w-full bg-transparent text-xs outline-none" />
              {sidebarQuery && (
                <button onClick={() => setSidebarQuery('')}><X size={11} className="text-neutral-400" /></button>
              )}
            </div>
          </div>
          <SectionTree />
          <AddSectionPanel />
          <AddBlockPanel />
          <VersionHistory onPreview={setPreviewVersion} />
        </aside>

        {/* CENTRE */}
        <PreviewFrame />

        {/* RIGHT */}
        <aside className="w-[320px] shrink-0 border-l border-neutral-200 bg-white">
          <Inspector />
        </aside>
      </div>

      {previewVersion && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-50 flex justify-center">
          <span className="pointer-events-auto rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
            Previewing “{previewVersion.label}” — not applied
          </span>
        </div>
      )}
    </div>
  );
}
