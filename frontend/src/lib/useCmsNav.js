import { useEffect, useState } from 'react';
import { api } from '../api/client';

/* ============================================================================
 * CMS NAVIGATION
 *
 * WHY THIS IS ITS OWN FILE
 *   The Footer renders on EVERY storefront route, so whatever it imports lands
 *   in the main shopper bundle. useCmsPage.js also holds the page loader, the
 *   redirect handling and the per-slug cache — none of which a shopper needs
 *   unless they actually open a CMS page. Splitting the nav out keeps that
 *   heavier module inside the lazy CmsPage chunk.
 *
 * SESSION CACHE
 *   The menu is fetched once and reused. Refetching on every navigation would
 *   cost one round trip per click, and ~190ms is the measured DB floor from
 *   this region (gotcha 74). A failure resolves to empty lists rather than
 *   throwing — a menu that will not load must render as nothing, never as a
 *   broken footer.
 * ========================================================================== */

let cache = null;
let inflight = null;
const EMPTY = { footer: [], header: [], footerGroups: [], headerGroups: [] };

export function useCmsNav() {
  const [nav, setNav] = useState(() => cache || EMPTY);

  /* gotcha 68: block body, not a bare async callback — React would call the
     returned Promise as a cleanup and blank the page. */
  useEffect(() => {
    if (cache) { setNav(cache); return undefined; }
    let alive = true;
    if (!inflight) {
      inflight = api('/cms/nav')
        .then((d) => {
          cache = {
            footer: d.footer || [],
            header: d.header || [],
            // Groups are additive — the flat arrays stay so an older consumer
            // keeps working. Both shapes come from one request.
            footerGroups: d.footerGroups || [],
            headerGroups: d.headerGroups || [],
          };
          return cache;
        })
        .catch(() => { cache = EMPTY; return cache; })
        .finally(() => { inflight = null; });
    }
    inflight.then((n) => { if (alive) setNav(n); });
    return () => { alive = false; };
  }, []);

  return nav;
}

/** Called after a publish so the footer picks up a newly visible page. */
export function invalidateCmsNav() {
  cache = null;
}
