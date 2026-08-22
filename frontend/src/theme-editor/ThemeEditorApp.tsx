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
import ActivateBanner from './ui/ActivateBanner';
import type { ThemeVersion } from './core/types';
import { api } from '../api/client';
import { invalidateThemeDoc } from './useThemeDoc';
import { useApp } from '../store/AppContext';
import { findNode } from './core/docUtils';
import { labelFor } from './core/registry';
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
  const [mobilePanel, setMobilePanel] = useState<'tree' | 'inspector' | null>(null);
  const savedRef = useRef<{ doc: typeof doc; theme: typeof theme } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    api('/theme?seed=1')
      .then((d: any) => {
        if (!alive) return;
        const published = d?.theme?.doc;
        const isLive = !!(published && Array.isArray(published.body) && published.body.length);
        // Prefer the draft so autosaved work is never lost between sessions.
        const draft = d?.draft && Array.isArray(d.draft.body) && d.draft.body.length ? d.draft : null;
        const loaded = draft || (isLive ? published : buildDefaultDoc(d?.storeSettings || {}));
        const t = { ...themeDefaults(), ...(d?.draftSettings || d?.theme?.settings || {}) };
        hydrate(loaded, t, d?.versions || [], isLive);
      })
      .catch(() => { if (alive) hydrate(buildDefaultDoc(), themeDefaults(), []); });
    return () => { alive = false; };
  }, [hydrate]);

  // ── Save ────────────────────────────────────────────────────────────────
  const save = useCallback(async (publish = false) => {
    const state = useEditor.getState();
    const prev = savedRef.current;
    const changed = prev ? diffDocs(prev.doc, state.doc) : null;
    // Human-readable version label, e.g. "Updated: Hero, Newsletter" instead
    // of "Published 4 Aug, 08:22" — so version history means something.
    const label = (() => {
      if (!changed) return undefined;
      const name = (id: string) => {
        const loc = findNode(state.doc, id);
        return loc ? labelFor(loc.node) : '';
      };
      const parts: string[] = [];
      if (changed.added.length) parts.push(`Added: ${changed.added.map(name).filter(Boolean).slice(0, 2).join(', ')}`);
      if (changed.changed.length) parts.push(`Updated: ${changed.changed.map(name).filter(Boolean).slice(0, 2).join(', ')}`);
      if (changed.removed.length) parts.push(`Removed: ${changed.removed.map(name).filter(Boolean).slice(0, 2).join(', ')}`);
      const s = parts.join(' · ');
      return s ? s.slice(0, 80) : undefined;
    })();
    setSaving(true);
    try {
      const res: any = await api('/theme', {
        method: 'PUT',
        token: auth?.token,
        body: {
          doc: state.doc,
          settings: state.theme,
          publish,
          label: publish ? label : undefined,
          // Incremental hint — the server stores the full doc but logs the delta
          changedNodes: changed ? [...changed.changed, ...changed.added] : undefined,
          removedNodes: changed?.removed,
        },
      });
      savedRef.current = { doc: state.doc, theme: state.theme };
      markSaved(state.doc, state.theme);
      if (res?.versions) setVersions(res.versions);
      if (publish) useEditor.getState().setLiveThemed(true);
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
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(false); return; }
      if (typing) return;
      if (mod && e.key.toLowerCase() === 'd' && selectedId) { e.preventDefault(); duplicate(selectedId); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        if (window.confirm('Delete this item? This cannot be undone.')) remove(selectedId);
        return;
      }
      if (e.key === 'Escape') select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, save, selectedId, duplicate, remove, select]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-white">
        <div className="flex items-center gap-2 text-sm text-[#777777]">
          <Loader2 size={16} className="animate-spin" /> Loading theme…
        </div>
      </div>
    );
  }

  return (
    <div className="te-shell fixed inset-0 z-50 flex flex-col bg-white text-black">
      <Topbar onSave={() => save(false)} onPublish={() => save(true)} />
      <ActivateBanner onActivate={() => save(true)} />

      <div className="relative flex flex-1 overflow-hidden">
        {/* LEFT — overlay on mobile, fixed sidebar from md up */}
        {mobilePanel === 'tree' && (
          <div className="absolute inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobilePanel(null)} />
        )}
        <aside className={`relative z-40 flex w-[290px] shrink-0 flex-col border-r border-[#EAEAEA] bg-white ${
          mobilePanel === 'tree' ? 'absolute inset-y-0 left-0 md:static' : 'hidden md:flex'
        }`}>
          <div className="border-b border-[#EAEAEA] px-3 py-2.5">
            <div className="flex items-center gap-1.5 border-b border-[#EAEAEA] px-1 py-1.5">
              <Search size={12} className="shrink-0 text-[#777777]" />
              <input value={sidebarQuery} onChange={(e) => setSidebarQuery(e.target.value)}
                placeholder="Search sections and blocks" className="w-full bg-transparent text-xs text-black outline-none placeholder:text-[#777777]" />
              {sidebarQuery && (
                <button onClick={() => setSidebarQuery('')}><X size={11} className="text-[#777777]" /></button>
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

        {/* RIGHT — overlay on mobile, fixed sidebar from md up */}
        {mobilePanel === 'inspector' && (
          <div className="absolute inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobilePanel(null)} />
        )}
        <aside className={`z-40 w-[320px] shrink-0 border-l border-white/10 bg-[#0A0A0A] ${
          mobilePanel === 'inspector' ? 'absolute inset-y-0 right-0 md:static' : 'hidden md:block'
        }`}>
          <Inspector />
        </aside>
        {/* Floating toggles — mobile only */}
        <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-2 md:hidden">
          <button onClick={() => setMobilePanel(mobilePanel === 'tree' ? null : 'tree')}
            className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
            Sections
          </button>
          <button onClick={() => setMobilePanel(mobilePanel === 'inspector' ? null : 'inspector')}
            className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
            Settings
          </button>
        </div>
      </div>

      {previewVersion && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-50 flex justify-center">
          <span className="pointer-events-auto border border-[#EAEAEA] bg-white px-4 py-2 text-xs font-semibold text-black">
            Previewing “{previewVersion.label}” — not applied
          </span>
        </div>
      )}
    </div>
  );
}
