import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useThemeDoc } from './useThemeDoc';
import { api } from '../api/client';

/* ============================================================================
 * Storefront product bridge (Shopify OS 2.0 — sections on the product page).
 *
 * When a product template is published, /product/:slug renders the template's
 * sections with the live product in context. Falls back to the hand-coded
 * Product page when no template exists or the theme is not published.
 * ========================================================================== */

const PageRenderer = lazy(() => import('./render/PageRenderer'));

export default function ThemedProduct({ fallback: Fallback }) {
  const { slug } = useParams();
  const { status, doc, theme, themed } = useThemeDoc();
  const [product, setProduct] = useState<undefined | null | any>(undefined);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setProduct(undefined);
    api(`/products/${slug}`)
      .then((d) => { if (alive) setProduct((d && d.product) || null); })
      .catch(() => { if (alive) setProduct(null); });
    return () => { alive = false; };
  }, [slug]);

  if (status === 'loading') return <Fallback />;
  const tdoc = themed ? doc?.templates?.product?.default : null;
  if (!tdoc) return <Fallback />;

  return (
    <Suspense fallback={<Fallback />}>
      <PageRenderer doc={tdoc} theme={theme} pageData={{ product }} />
    </Suspense>
  );
}
