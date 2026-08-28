import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useThemeDoc } from './useThemeDoc';

/* ============================================================================
 * Storefront CMS-page bridge — renders the page template; falls back to the
 * coded CMS page when no template exists.
 * ========================================================================== */

const PageRenderer = lazy(() => import('./render/PageRenderer'));

export default function ThemedPage({ fallback: Fallback }) {
  const { cmsSlug } = useParams();
  const { status, doc, theme, themed } = useThemeDoc();

  if (status === 'loading') return <Fallback />;
  const tdoc = themed ? doc?.templates?.page?.default : null;
  if (!tdoc) return <Fallback />;

  return (
    <Suspense fallback={<Fallback />}>
      <PageRenderer doc={tdoc} theme={theme} pageData={{ page: { slug: cmsSlug } }} />
    </Suspense>
  );
}
