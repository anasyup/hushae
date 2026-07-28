import { useEffect, useState } from 'react';
import PageRenderer from '../render/PageRenderer';
import type { EditorToPreview, PageDocument, SettingsBag } from '../core/types';
import { buildDefaultDoc } from '../schemas/defaultDoc';
import { themeDefaults } from '../schemas/theme';
import '../editor.css';

/* ============================================================================
 * The page loaded inside the editor's iframe. It renders the document the
 * editor pushes over postMessage and reports clicks/hovers back.
 * ========================================================================== */

export default function PreviewApp() {
  const [doc, setDoc] = useState<PageDocument>(() => buildDefaultDoc());
  const [theme, setTheme] = useState<SettingsBag>(() => themeDefaults());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
    window.parent?.postMessage({ source: 'hushae-preview', type: 'ready' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const emit = (type: 'select' | 'hover', id: string | null) => {
    try { window.parent?.postMessage({ source: 'hushae-preview', type, id }, '*'); } catch { /* ignore */ }
  };

  return (
    <PageRenderer
      doc={doc}
      theme={theme}
      editable
      selectedId={selectedId}
      hoveredId={hoveredId}
      onSelect={(id) => { setSelectedId(id || null); emit('select', id || null); }}
      onHover={(id) => { setHoveredId(id); emit('hover', id); }}
    />
  );
}
