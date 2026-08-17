import CollectionCard from '../CollectionCard';

/* ============================================================================
 * LuxuryProductCard — now renders the unified Sale-page minimal card
 * (merchant request: ALL product cards everywhere should look like the
 * Sale page card). Thin wrapper over CollectionCard variant="minimal" so
 * the New Arrivals section picks up the same register automatically.
 * ========================================================================== */

export default function LuxuryProductCard({ product: p, priority = false }) {
  return <CollectionCard product={p} priority={priority} variant="minimal" />;
}
