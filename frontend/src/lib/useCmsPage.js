import { useEffect, useState } from 'react';
import { api } from '../api/client';

/* ============================================================================
 * CMS PAGE LOADER
 *
 * Same contract and same caching strategy as theme-editor/useThemeDoc.js — one
 * in-flight request per slug is shared by every caller, so a page and its SEO
 * block never double-fetch or disagree.
 *
 * WHAT THE SERVER DECIDES, NOT THIS FILE
 *   Whether a page is live. /api/cms/page/:slug returns 404 for a draft, a
 *   scheduled page before its date and an expired page after its date. This
 *   hook never inspects status, publishAt or unpublishAt — if it did, the rule
 *   would exist in two places and one of them would eventually be wrong.
 *   A shopper cannot reach a draft by guessing a slug because the SERVER
 *   refuses, not because the browser hides it.
 *
 * REDIRECTS
 *   When a page is missing, the 404 body may carry `redirectTo`. The server
 *   already collapses chains (a -> b -> c resolves in one hop), so one lookup
 *   is enough. Resolving the redirect BEFORE rendering a 404 is the whole point
 *   of the slug manager: a link in a WhatsApp message from six months ago must
 *   still land somewhere.
 * ========================================================================== */

const cache = new Map();     // slug -> resolved state
const inflight = new Map();  // slug -> Promise

/** Shape returned in every branch, so callers never guard on undefined. */
const EMPTY = { status: 'loading', page: null, seo: null, redirectTo: null, preview: false };

function load(slug, previewToken) {
  // A preview is per-request and must never be cached — the whole point is to
  // see the newest draft, and a cached preview is a stale draft.
  const key = previewToken ? `${slug}::preview::${previewToken.slice(-12)}` : slug;
  if (!previewToken && cache.has(key)) return Promise.resolve(cache.get(key));
  if (inflight.has(key)) return inflight.get(key);

  const qs = previewToken ? `?preview=${encodeURIComponent(previewToken)}` : '';
  const p = api(`/cms/page/${encodeURIComponent(slug)}${qs}`)
    .then((d) => {
      const out = {
        status: 'found',
        page: d.page || null,
        seo: d.seo || null,
        redirectTo: null,
        preview: !!d.preview,
      };
      if (!previewToken) cache.set(key, out);
      return out;
    })
    .catch((e) => {
      /* api() throws on a non-2xx and keeps the payload on err.raw, which is
         where the server puts `redirectTo` alongside its 404. A network failure
         has no raw at all — treated as "missing" rather than crashing, because
         a dead connection should show the same friendly page as a dead link. */
      const raw = e?.raw || {};
      const out = {
        status: 'missing',
        page: null,
        seo: null,
        redirectTo: raw.redirectTo || null,
        redirectCode: raw.code || 301,
        preview: false,
      };
      // Only cache a genuine 404. A 500 or an offline blip must be retried.
      if (!previewToken && e?.status === 404) cache.set(key, out);
      return out;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

export function useCmsPage(slug, previewToken = null) {
  const [state, setState] = useState(() => {
    if (!slug) return { ...EMPTY, status: 'missing' };
    return !previewToken && cache.has(slug) ? cache.get(slug) : EMPTY;
  });

  /* gotcha 68: block body. Handing useEffect a function that returns a Promise
     makes React call the Promise as a cleanup — "TypeError: n is not a
     function", blank page. Cost two admin screens in Sprint 2K. */
  useEffect(() => {
    if (!slug) { setState({ ...EMPTY, status: 'missing' }); return undefined; }
    let alive = true;
    setState((s) => (s.status === 'loading' ? s : EMPTY));
    load(slug, previewToken).then((r) => { if (alive) setState(r); });
    return () => { alive = false; };
  }, [slug, previewToken]);

  return state;
}

/** Called after a publish so the storefront stops serving the old copy. */
export function invalidateCmsPage(slug) {
  if (slug) {
    cache.delete(slug);
    [...cache.keys()].filter((k) => k.startsWith(`${slug}::`)).forEach((k) => cache.delete(k));
  } else {
    cache.clear();
  }
}

/* Navigation lives in ./useCmsNav.js — the Footer renders on every route, so
   importing it from here would pull this whole module (page loader, redirect
   handling, per-slug cache) into the main shopper bundle. */
