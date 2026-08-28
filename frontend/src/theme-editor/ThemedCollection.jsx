import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useThemeDoc } from './useThemeDoc';

/* ============================================================================
 * Storefront collection bridge — renders the collection template with the
 * current collection slug in context; falls back to the coded Collection page.
 * ========================================================================== */

const PageRenderer = lazy(() => import('./render/PageRenderer'));

export default function ThemedCollection({ fallback: Fallback }) {
  const { slug } = useParams();
  const { status, doc, theme, themed } = useThemeDoc();

  if (status === 'loading') return <Fallback />;
  const tdoc = themed ? doc?.templates?.collection?.default : null;
  if (!tdoc) return <Fallback />;

  return (
    <Suspense fallback={<Fallback />}>
      <PageRenderer doc={tdoc} theme={theme} pageData={{ collectionSlug: slug }} />
    </Suspense>
  );
}
