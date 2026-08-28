import { lazy, Suspense } from 'react';
import { useThemeDoc } from './useThemeDoc';

/* ============================================================================
 * Storefront cart bridge — renders the cart template for /cart; falls back to
 * the coded Cart page when no template exists.
 * ========================================================================== */

const PageRenderer = lazy(() => import('./render/PageRenderer'));

export default function ThemedCart({ fallback: Fallback }) {
  const { status, doc, theme, themed } = useThemeDoc();

  if (status === 'loading') return <Fallback />;
  const tdoc = themed ? doc?.templates?.cart?.default : null;
  if (!tdoc) return <Fallback />;

  return (
    <Suspense fallback={<Fallback />}>
      <PageRenderer doc={tdoc} theme={theme} />
    </Suspense>
  );
}
