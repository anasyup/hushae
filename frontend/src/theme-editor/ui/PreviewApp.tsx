import { useCallback, useEffect, useMemo, useState } from 'react';
import PageRenderer from '../render/PageRenderer';
import PreviewOverlay from '../render/PreviewOverlay';
import { usePreviewDnd, type DropEdge } from '../render/usePreviewDnd';
import type { EditorToPreview, PageDocument, PreviewToEditor, SettingsBag } from '../core/types';
import { buildDefaultDoc } from '../schemas/defaultDoc';
import { themeDefaults } from '../schemas/theme';
import { findNode } from '../core/docUtils';
import { getBlockSchema, getSectionSchema, labelFor } from '../core/registry';
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

  const send = useCallback((msg: Omit<PreviewToEditor, 'source'>) => {
    try { window.parent?.postMessage({ source: 'hushae-preview', ...msg }, '*'); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent<EditorToPreview>) => {
      const d = e.data;
      if (!d || d.source !== 'hushae-editor') return;
      if (d.type === 'doc') { setDoc(d.doc); setTheme(d.theme); }
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
    return () => window.removeEventListener('message', onMsg);
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

  return (
    <>
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
    </>
  );
}
