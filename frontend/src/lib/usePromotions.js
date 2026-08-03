import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { marketingConfig, scopeCovers } from './marketingConfig';

/* ============================================================================
 * usePromotions — one fetch of /promotions/active, shared by every surface.
 *
 * Module-level cache with an in-flight promise, for one measured reason: the
 * shop grid, the header and each product card would otherwise each fire their
 * own request. A 24-card grid is 24 identical calls for one JSON document that
 * changes when the merchant presses Save.
 *
 * The cache is per page load and short-lived. A merchant enabling a promotion
 * sees it after a refresh, which is the same contract every other config on
 * this storefront has.
 * ========================================================================== */

const TTL = 60000;
let cache = { at: 0, data: null };
let inFlight = null;

function fetchActive() {
  const now = Date.now();
  if (cache.data && now - cache.at < TTL) return Promise.resolve(cache.data);
  if (inFlight) return inFlight;
  inFlight = api('/promotions/active')
    .then((d) => { cache = { at: Date.now(), data: d }; return d; })
    .catch(() => ({ enabled: false, promotions: [] }))
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** Everything the storefront knows about live promotions. */
export function usePromotions() {
  const [data, setData] = useState(cache.data);

  useEffect(() => {
    let alive = true;
    fetchActive().then((d) => { if (alive) setData(d); });
    return () => { alive = false; };
  }, []);

  return {
    loading: !data,
    enabled: !!data?.enabled,
    promotions: data?.promotions || [],
    flash: data?.flash || null,
    badges: data?.badges || null,
    scope: data?.scope?.byPromotion || [],
  };
}

/**
 * Automatic badges for a set of products.
 *
 * Trending needs recent order counts, which only the server can know, so this
 * is one POST for the whole grid rather than a rule evaluated per card.
 * Returns {} until it resolves — a card renders its existing badge meanwhile
 * and swaps, which cannot shift layout because the badge slot is absolutely
 * positioned over the image.
 */
export function useProductBadges(products) {
  const [map, setMap] = useState({});

  const slugs = useMemo(
    () => (products || []).map((p) => p?.slug).filter(Boolean).slice(0, 60),
    [products],
  );
  const key = slugs.join(',');

  useEffect(() => {
    if (!key) { setMap({}); return undefined; }
    let alive = true;
    api('/promotions/badges', { method: 'POST', body: { slugs: key.split(',') } })
      .then((d) => { if (alive) setMap(d.badges || {}); })
      .catch(() => { if (alive) setMap({}); });
    return () => { alive = false; };
  }, [key]);

  return map;
}

/** Which live, card-visible promotions cover this product. */
export function promosForProduct(scope, promotions, product) {
  if (!product || !scope?.length) return [];
  const ids = scope.filter((s) => scopeCovers(s, product)).map((s) => s.id);
  return promotions.filter((p) => ids.includes(p.id) && p.showOnCard);
}

export { marketingConfig };
