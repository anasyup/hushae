import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../core/store';
import { findNode } from '../core/docUtils';
import type { EditorToPreview, PreviewToEditor } from '../core/types';

/* ============================================================================
 * Centre panel — the storefront in an iframe.
 * The document is pushed over postMessage on every change, so the preview
 * repaints without a reload. Selection is two-way.
 * ========================================================================== */

const FRAME_W: Record<string, number | string> = { desktop: '100%', tablet: 834, mobile: 390 };

export default function PreviewFrame() {
  const doc = useEditor((s) => s.doc);
  const theme = useEditor((s) => s.theme);
  const device = useEditor((s) => s.device);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const hover = useEditor((s) => s.hover);

  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  const post = (msg: EditorToPreview) => {
    try { ref.current?.contentWindow?.postMessage(msg, '*'); } catch { /* ignore */ }
  };

  useEffect(() => {
    const onMsg = (e: MessageEvent<PreviewToEditor>) => {
      const d = e.data;
      if (!d || d.source !== 'hushae-preview') return;
      if (d.type === 'ready') setReady(true);
      if (d.type === 'select') select(d.id || null);
      if (d.type === 'hover') hover(d.id);
      // On-canvas editing — the preview asks, the store mutates.
      if (d.type === 'move') {
        const st = useEditor.getState();
        const t = findNode(st.doc, d.targetId);
        if (!t) return;
        if (d.edge === 'inside') {
          const kids = (t.node as any).blocks || [];
          st.dropNode(d.id, d.targetId, kids.length);
          st.toggleExpanded(d.targetId, true);
        } else {
          const parent = t.isSection ? t.group : (t.ancestors.at(-1)?.id ?? t.section.id);
          st.dropNode(d.id, parent, d.edge === 'after' ? t.index + 1 : t.index);
        }
      }
      if (d.type === 'nudge') useEditor.getState().move(d.id, d.delta);
      if (d.type === 'duplicate') useEditor.getState().duplicate(d.id);
      if (d.type === 'delete') useEditor.getState().remove(d.id);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [select, hover]);

  // Push document + theme on every change
  useEffect(() => {
    if (!ready) return;
    post({ source: 'hushae-editor', type: 'doc', doc, theme });
  }, [doc, theme, ready]);

  // Push selection and scroll the preview to it
  useEffect(() => {
    if (!ready) return;
    post({ source: 'hushae-editor', type: 'select', id: selectedId });
    if (selectedId) post({ source: 'hushae-editor', type: 'scroll-to', id: selectedId });
  }, [selectedId, ready]);

  const width = FRAME_W[device];

  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-neutral-200/70 p-5">
      <div
        className="overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 transition-[width] duration-300"
        style={{ width, maxWidth: '100%', height: 'calc(100vh - 96px)' }}
      >
        <iframe
          ref={ref}
          src="/__theme-preview"
          title="Storefront preview"
          className="h-full w-full border-0"
          onLoad={() => post({ source: 'hushae-editor', type: 'doc', doc, theme })}
        />
      </div>
    </div>
  );
}
