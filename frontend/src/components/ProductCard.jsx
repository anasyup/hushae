import { memo } from 'react';
import CollectionCard from './CollectionCard';

/* ============================================================================
 * HUSHAE ProductCard — thin alias of CollectionCard (the brand's single card
 * design, "Fashion Product Grid" register). Kept as its own export so every
 * existing caller (home, sale, search, rails, TheEdit…) stays untouched.
 * `ratio` is honoured for editorial layouts (e.g. The Edit lead 5/7).
 * ========================================================================== */

function ProductCard(props) {
  return <CollectionCard {...props} />;
}

export default memo(ProductCard);
