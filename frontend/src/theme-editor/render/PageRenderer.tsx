import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PageDocument, SettingsBag } from '../core/types';
import { SectionRenderer } from './SectionRenderer';
import { Plus as PlusIcon } from 'lucide-react';
import { RenderProvider, type StoreData } from './RenderContext';
import type { SectionGroup } from '../core/types';
import { themeToCssVars } from '../schemas/theme';
import { api } from '../../api/client';

/* ============================================================================
 * Renders a whole page document. Used by the editor preview (editable) and by
 * the live storefront (read-only) — same component, same output.
 *
 * `pageData` carries route context for non-home templates (the current
 * product, collection slug or CMS page) so product/collection/page sections
 * can pull live data.
 * ========================================================================== */

interface Props {
  doc: PageDocument;
  theme: SettingsBag;
  editable?: boolean;
  selectedId?: string | null;
  hoveredId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  /** Route data: { product?, collectionSlug?, page? } */
  pageData?: { product?: any; collectionSlug?: string; page?: any };
  /** Shopify-style inline "+ Add section" zones (editable preview only). */
  onAddSection?: (group: SectionGroup) => void;
}

export default function PageRenderer({ doc, theme, editable = false, selectedId, hoveredId, onSelect, onHover, pageData, onAddSection }: Props) {
  const [products, setProducts] = useState<Record<string, any[]>>({});
  const [collectionSort, setCollectionSort] = useState<string>('newest');
  const [data, setData] = useState<StoreData>({
    products: {}, categories: [], collections: [], pages: [], blogs: [], menus: {}, settings: {},
    product: pageData?.product,
    collectionSlug: pageData?.collectionSlug,
    page: pageData?.page,
    collectionSort: 'newest',
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

  // Route context can arrive asynchronously (storefront bridges fetch the
  // product after mount) — keep `data` in sync with pageData.
  useEffect(() => {
    if (!pageData) return;
    const prod = pageData.product;
    const col = pageData.collectionSlug;
    const pg = pageData.page;
    setData((d) => ({
      ...d,
      product: prod !== undefined ? prod : d.product,
      collectionSlug: col !== undefined ? col : d.collectionSlug,
      page: pg !== undefined ? pg : d.page,
    }));
  }, [pageData?.product, pageData?.collectionSlug, pageData?.page]);

  // Editor preview has no route context — seed a sample product and the first
  // collection so product/collection template sections show real content
  // while the merchant is designing.
  useEffect(() => {
    if (!editable || data.product) return;
    api('/products?limit=1')
      .then((d: any) => { if (d?.products?.[0]) setData((s) => (s.product ? s : { ...s, product: d.products[0] })); })
      .catch(() => {});
  }, [editable, data.product]);

  useEffect(() => {
    if (!editable || data.collectionSlug || !data.categories.length) return;
    setData((d) => ({ ...d, collectionSlug: d.categories[0]?.slug }));
  }, [editable, data.collectionSlug, data.categories]);

  const requestProducts = useCallback((key: string, query: string) => {
    if (inflight.current.has(key)) return;
    inflight.current.add(key);
    api(query)
      .then((d: any) => setProducts((p) => ({ ...p, [key]: d.products || [] })))
      .catch(() => setProducts((p) => ({ ...p, [key]: [] })));
  }, []);

  const getProducts = useCallback((key: string) => products[key], [products]);

  const ctx = useMemo(
    () => ({
      editable, theme, data, selectedId, hoveredId, onSelect, onHover, getProducts, requestProducts,
      setCollectionSort: (sort: string) => { setCollectionSort(sort); setData((d) => ({ ...d, collectionSort: sort })); },
    }),
    [editable, theme, data, selectedId, hoveredId, onSelect, onHover, getProducts, requestProducts],
  );

  const vars = useMemo(() => themeToCssVars(theme), [theme]);
  const all = [...doc.header, ...doc.body, ...doc.footer];

  return (
    <RenderProvider value={ctx}>
      <div className={`te-root${theme.kenBurns ? ' te-kb' : ''}`} style={{ ...vars, background: 'var(--t-bg)', color: 'var(--t-text)' } as React.CSSProperties}
        onClick={editable ? () => onSelect?.('') : undefined}>
        {theme.customCss ? <style>{String(theme.customCss)}</style> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--t-section-gap)' }}>
          {editable && onAddSection && (
            <ZoneAdd label="Header" group="header" onAdd={onAddSection} />
          )}
          {doc.body.map((s) => <SectionRenderer key={s.id} section={s} />)}
          {editable && onAddSection && (
            <ZoneAdd label="Template" group="body" onAdd={onAddSection} />
          )}
          {doc.footer.map((s) => <SectionRenderer key={s.id} section={s} />)}
          {editable && onAddSection && (
            <ZoneAdd label="Footer" group="footer" onAdd={onAddSection} />
          )}
        </div>
      </div>
    </RenderProvider>
  );
}

/* Shopify-style inline zone add button — dashed ghost row that opens the
   Add-section drawer for the header/body/footer zone it belongs to. */
function ZoneAdd({ label, group, onAdd }: { label: string; group: SectionGroup; onAdd: (g: SectionGroup) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onAdd(group); }}
      className="te-zone-add"
      title={`Add section to ${label}`}
    >
      <PlusIcon size={15} /> Add section
      <span className="te-zone-add-zone">{label}</span>
    </button>
  );
}
