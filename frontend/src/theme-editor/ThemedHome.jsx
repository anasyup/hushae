import { lazy, Suspense } from 'react';
import { useThemeDoc } from './useThemeDoc';

/* ============================================================================
 * Storefront bridge.
 *
 * When the merchant has published a theme document we render it; otherwise the
 * original hand-coded Home page is shown, so the migration is reversible and
 * the site can never go blank.
 * ========================================================================== */

const PageRenderer = lazy(() => import('./render/PageRenderer'));

export default function ThemedHome({ fallback: Fallback }) {
  const { status, doc, theme, themed } = useThemeDoc();

  if (status === 'loading') return <div style={{ minHeight: '60vh' }} />;
  if (!themed) return <Fallback />;

  return (
    <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
      <PageRenderer doc={doc} theme={theme} />
    </Suspense>
  );
}
