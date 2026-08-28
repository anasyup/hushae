import { lazy, Suspense } from 'react';
import { useThemeDoc } from './useThemeDoc';

/* ============================================================================
 * Storefront blog bridge — renders the blog template for /blog; falls back to
 * the coded Blog page when no template exists.
 * ========================================================================== */

const PageRenderer = lazy(() => import('./render/PageRenderer'));

export default function ThemedBlog({ fallback: Fallback }) {
  const { status, doc, theme, themed } = useThemeDoc();

  if (status === 'loading') return <Fallback />;
  const tdoc = themed ? doc?.templates?.blog?.default : null;
  if (!tdoc) return <Fallback />;

  return (
    <Suspense fallback={<Fallback />}>
      <PageRenderer doc={tdoc} theme={theme} />
    </Suspense>
  );
}
