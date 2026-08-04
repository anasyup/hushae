import { lazy, Suspense } from 'react';
import { useThemeDoc } from './useThemeDoc';

/* ============================================================================
 * Storefront home bridge.
 *
 * When a theme document is published (themed === true), the home page is
 * rendered from that document — header, body and footer — so everything the
 * merchant builds in the Theme Editor actually appears on the website.
 *
 * When no document has been published yet (or it is empty), we fall back to
 * the stable hand-coded Home page so the storefront is never blank.
 *
 * PageRenderer is lazy-loaded so shoppers who never see a themed home don't
 * pay for the theme-editor renderer in their initial bundle.
 * ========================================================================== */

const PageRenderer = lazy(() => import('./render/PageRenderer'));

export default function ThemedHome({ fallback: Fallback }) {
  const { status, doc, theme, themed } = useThemeDoc();

  // While the theme doc is loading, keep the fallback visible (no blank flash).
  if (status === 'loading' || !themed || !doc) {
    return <Fallback />;
  }

  return (
    <Suspense fallback={<Fallback />}>
      <PageRenderer doc={doc} theme={theme} />
    </Suspense>
  );
}
