import { useCallback, useEffect, useMemo, useState, Component } from 'react';
import PageRenderer from '../render/PageRenderer';
import PreviewOverlay from '../render/PreviewOverlay';
import { usePreviewDnd, type DropEdge } from '../render/usePreviewDnd';
import type { EditorToPreview, PageDocument, PreviewToEditor, SettingsBag } from '../core/types';
import { buildDefaultDoc } from '../schemas/defaultDoc';
import { themeDefaults } from '../schemas/theme';
import { findNode } from '../core/docUtils';
import { getBlockSchema, getSectionSchema, labelFor } from '../core/registry';
import { api } from '../../api/client';
import '../editor.css';

/* ============================================================================
 * The page loaded inside the editor's iframe.
 *
 * Renders whatever document the editor pushes over postMessage, and reports
 * interaction back: selection, hover, on-canvas drag-and-drop and the toolbar
 * actions. All mutations happen in the editor's store — this side only asks.
 * ========================================================================== */

export default function PreviewApp() {
  const [doc, setDoc] = useState<PageDocument>(() => buildDefaultDoc());
  const [theme, setTheme] = useState<SettingsBag>(() => themeDefaults());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [crash, setCrash] = useState<string | null>(null);

  const send = useCallback((msg: Omit<PreviewToEditor, 'source'>) => {
    try { window.parent?.postMessage({ source: 'hushae-preview', ...msg }, '*'); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let gotDoc = false;
    const onMsg = (e: MessageEvent<EditorToPreview>) => {
      const d = e.data;
      if (!d || d.source !== 'hushae-editor') return;
      if (d.type === 'doc') { gotDoc = true; setDoc(d.doc); setTheme(d.theme); }
      if (d.type === 'select') setSelectedId(d.id);
      if (d.type === 'scroll-to') {
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-node-id="${d.id}"]`);
          if (!el) return;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('te-flash');
          setTimeout(() => el.classList.remove('te-flash'), 1000);
        });
      }
    };
    window.addEventListener('message', onMsg);
    send({ type: 'ready' } as any);
    // Safety net: if the editor never pushes a document (message race, iframe
    // cold start, editor error), load the published theme ourselves so the
    // preview is never blank.
    const t = setTimeout(async () => {
      if (gotDoc) return;
      try {
        const d = await api('/theme');
        const doc = d?.theme?.doc;
        if (doc && Array.isArray(doc.body)) {
          setDoc(doc);
          setTheme(d?.theme?.settings || themeDefaults());
        }
      } catch { /* keep default doc */ }
    }, 2500);
    return () => { clearTimeout(t); window.removeEventListener('message', onMsg); };
  }, [send]);

  // ── selected node facts ───────────────────────────────────────────────
  const loc = useMemo(() => (selectedId ? findNode(doc, selectedId) : null), [doc, selectedId]);
  const schema: any = loc
    ? (loc.isSection ? getSectionSchema(loc.node.type) : getBlockSchema(loc.node.type))
    : null;
  const canModify = !!loc && !(loc.isSection && schema?.locked);

  const canNest = useCallback((id: string) => {
    const l = findNode(doc, id);
    if (!l) return false;
    if (l.isSection) return true;
    const sc: any = getBlockSchema(l.node.type);
    return !!sc?.accepts?.length;
  }, [doc]);

  const { draggingId, target } = usePreviewDnd({
    enabled: true,
    canNest,
    onMove: (id, targetId, edge) => send({ type: 'move', id, targetId, edge } as any),
  });

  if (crash) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', fontSize: 14, color: '#B42318', background: '#FFF5F5', minHeight: '100vh' }}>
        <p><b>Preview error</b> — theme render mein masla aya.</p>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{crash}</pre>
        <button onClick={() => { setCrash(null); setDoc(buildDefaultDoc()); }} style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}>Reset preview</button>
      </div>
    );
  }

  return (
    <>
      <PreviewBoundary onError={(e: Error) => setCrash(e?.message || String(e))}>
      <PageRenderer
        doc={doc}
        theme={theme}
        editable
        selectedId={selectedId}
        hoveredId={hoveredId}
        onSelect={(id) => { setSelectedId(id || null); send({ type: 'select', id: id || '' } as any); }}
        onHover={(id) => { setHoveredId(id); send({ type: 'hover', id } as any); }}
      />

      <PreviewOverlay
        selectedId={selectedId}
        label={loc ? labelFor(loc.node) : ''}
        dragging={!!draggingId}
        target={target}
        canModify={canModify}
        onMove={(delta) => selectedId && send({ type: 'nudge', id: selectedId, delta } as any)}
        onDuplicate={() => selectedId && send({ type: 'duplicate', id: selectedId } as any)}
        onDelete={() => selectedId && send({ type: 'delete', id: selectedId } as any)}
      />
      </PreviewBoundary>
    </>
  );
}

/* Error boundary so a render crash shows a message instead of a blank iframe. */
class PreviewBoundary extends Component<{ onError: (e: Error) => void; children: React.ReactNode }, { failed: boolean }> {
  constructor(props: any) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: Error) { this.props.onError(e); }
  render() { return this.state.failed ? null : this.props.children; }
}
