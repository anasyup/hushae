import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PageDocument, SettingsBag } from '../core/types';
import { SectionRenderer } from './SectionRenderer';
import { RenderProvider, type StoreData } from './RenderContext';
import { themeToCssVars } from '../schemas/theme';
import { api } from '../../api/client';

/* ============================================================================
 * Renders a whole page document. Used by the editor preview (editable) and by
 * the live storefront (read-only) — same component, same output.
 * ========================================================================== */

interface Props {
  doc: PageDocument;
  theme: SettingsBag;
  editable?: boolean;
  selectedId?: string | null;
  hoveredId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

export default function PageRenderer({ doc, theme, editable = false, selectedId, hoveredId, onSelect, onHover }: Props) {
  const [products, setProducts] = useState<Record<string, any[]>>({});
  const [data, setData] = useState<StoreData>({
    products: {}, categories: [], collections: [], pages: [], blogs: [], menus: {}, settings: {},
  });
  const inflight = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    Promise.allSettled([api('/categories'), api('/settings')]).then(([cats, settings]) => {
      if (!alive) return;
      setData((d) => ({
        ...d,
        categories: cats.status === 'fulfilled' ? (cats.value as any).categories || [] : [],
        collections: cats.status === 'fulfilled' ? (cats.value as any).categories || [] : [],
        settings: settings.status === 'fulfilled' ? (settings.value as any).settings || {} : {},
      }));
    });
    return () => { alive = false; };
  }, []);

  const requestProducts = useCallback((key: string, query: string) => {
    if (inflight.current.has(key)) return;
    inflight.current.add(key);
    api(query)
      .then((d: any) => setProducts((p) => ({ ...p, [key]: d.products || [] })))
      .catch(() => setProducts((p) => ({ ...p, [key]: [] })));
  }, []);

  const getProducts = useCallback((key: string) => products[key], [products]);

  const ctx = useMemo(
    () => ({ editable, theme, data, selectedId, hoveredId, onSelect, onHover, getProducts, requestProducts }),
    [editable, theme, data, selectedId, hoveredId, onSelect, onHover, getProducts, requestProducts],
  );

  const vars = useMemo(() => themeToCssVars(theme), [theme]);
  const all = [...doc.header, ...doc.body, ...doc.footer];

  return (
    <RenderProvider value={ctx}>
      <div className="te-root" style={{ ...vars, background: 'var(--t-bg)', color: 'var(--t-text)' } as React.CSSProperties}
        onClick={editable ? () => onSelect?.('') : undefined}>
        {theme.customCss ? <style>{String(theme.customCss)}</style> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--t-section-gap)' }}>
          {all.map((s) => <SectionRenderer key={s.id} section={s} />)}
        </div>
      </div>
    </RenderProvider>
  );
}
