import { useEffect, useState } from 'react';
import { api } from '../api/client';

/* ============================================================================
 * Shared theme-document loader.
 *
 * One in-flight request is reused by every caller, so App (deciding whether to
 * render the legacy chrome) and ThemedHome (rendering the document) never
 * double-fetch or disagree.
 *
 * `themed` is true only when a published document actually exists with at
 * least one body section — that is the moment the storefront hands the home
 * page to the theme editor. When there is no published doc, the storefront
 * keeps rendering the hand-coded Home page (stable fallback).
 * ========================================================================== */

let cache = null;      // { doc, theme, themed }
let inflight = null;
const listeners = new Set();

function load() {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = api('/theme')
    .then((d) => {
      const doc = d?.theme?.doc;
      const hasBody = !!(doc && Array.isArray(doc.body) && doc.body.length);
      // Multi-template: themed when the legacy doc OR any page-type template
      // (index/product/collection/page) has a published body.
      const tmpls = doc?.templates;
      const anyTemplate = !!(tmpls && ['index', 'product', 'collection', 'page', 'blog', 'cart'].some((t) => {
        const td = tmpls[t] && (tmpls[t].default || tmpls[t]);
        return td && Array.isArray(td.body) && td.body.length;
      }));
      cache = {
        doc,
        theme: d?.theme?.settings || {},
        themed: hasBody || anyTemplate, // published doc exists → render it
      };
      return cache;
    })
    .catch(() => {
      cache = { doc: null, theme: {}, themed: false };
      return cache;
    })
    .finally(() => {
      inflight = null;
      listeners.forEach((fn) => fn(cache));
    });
  return inflight;
}

/**
 * @returns {{ status: 'loading'|'ready', doc: object|null, theme: object, themed: boolean }}
 */
export function useThemeDoc() {
  const [state, setState] = useState(() => (cache ? { status: 'ready', ...cache } : { status: 'loading', doc: null, theme: {}, themed: false }));

  useEffect(() => {
    let alive = true;
    if (cache) { setState({ status: 'ready', ...cache }); return undefined; }
    const fn = (c) => { if (alive) setState({ status: 'ready', ...c }); };
    listeners.add(fn);
    load().then((c) => { if (alive) setState({ status: 'ready', ...c }); });
    return () => { alive = false; listeners.delete(fn); };
  }, []);

  return state;
}

/** Called by the editor after a publish so the storefront picks up changes. */
export function invalidateThemeDoc() {
  cache = null;
}
