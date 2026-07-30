import { lazy, Suspense } from 'react';
import { useThemeDoc } from './useThemeDoc';

/**
 * While the theme document is in flight the page must still occupy the height
 * it is about to have. A 60vh placeholder collapsed the document to ~1100px
 * and then expanded it to ~9400px when the answer arrived, which measured as
 * a 0.2933 layout shift — the largest on the site. The hero is a full-viewport
 * band in both branches, so reserving exactly that is correct either way.
 */
const HoldSpace = () => (
  <div aria-hidden="true" className="min-h-[100svh] w-full bg-obsidian" />
);

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

  if (status === 'loading') return <HoldSpace />;
  if (!themed) return <Fallback />;

  return (
    <Suspense fallback={<HoldSpace />}>
      <PageRenderer doc={doc} theme={theme} />
    </Suspense>
  );
}
