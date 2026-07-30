import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/* ============================================================================
 * Filter state, owned entirely by the URL.
 *
 * Two behaviours the previous implementation got wrong, both measured:
 *
 *  · every filter wrote with `replace: true`, so the browser Back button
 *    left /shop altogether instead of undoing the last filter. Filters now
 *    push, and only the sort control replaces (sorting is a re-ordering of
 *    the same result set, not a new place).
 *
 *  · multi-select was impossible — `size=S` then `size=M` replaced rather
 *    than added. Values are stored comma-separated and parsed back to arrays.
 * ========================================================================== */

export const MULTI = ['tier', 'size', 'color', 'badge', 'fit'];
export const SINGLE = ['category', 'gender', 'sort', 'q', 'availability', 'minPrice', 'maxPrice'];

const splitList = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

export default function useShopFilters(preset = {}) {
  const [params, setParams] = useSearchParams();

  const get = useCallback((k) => params.get(k) || '', [params]);
  const list = useCallback((k) => splitList(params.get(k)), [params]);

  const write = useCallback((mutate, { replace = false } = {}) => {
    const next = new URLSearchParams(params);
    mutate(next);
    // Changing any filter should return the shopper to the first screen of
    // results, but never silently — the caller decides about scrolling.
    setParams(next, { replace });
  }, [params, setParams]);

  /** Single-value facet: category, availability, price, sort. */
  const setOne = useCallback((k, v, opts) => {
    write((n) => { if (v) n.set(k, v); else n.delete(k); }, opts);
  }, [write]);

  /** Multi-value facet: add or remove one value from the comma list. */
  const toggleMany = useCallback((k, v) => {
    write((n) => {
      const cur = splitList(n.get(k));
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      if (next.length) n.set(k, next.join(',')); else n.delete(k);
    });
  }, [write]);

  const clearOne = useCallback((k, v) => {
    write((n) => {
      if (!v) { n.delete(k); return; }
      const next = splitList(n.get(k)).filter((x) => x !== v);
      if (next.length) n.set(k, next.join(',')); else n.delete(k);
    });
  }, [write]);

  /** Set several keys against one URL snapshot — two setOne calls in a row
   *  would each read stale params and the second would drop the first. */
  const setMany = useCallback((pairs) => {
    write((n) => {
      Object.entries(pairs).forEach(([k, v]) => { if (v) n.set(k, v); else n.delete(k); });
    });
  }, [write]);

  const clearAll = useCallback(() => {
    write((n) => {
      [...MULTI, 'category', 'availability', 'minPrice', 'maxPrice'].forEach((k) => n.delete(k));
    });
  }, [write]);

  const category = preset.category || get('category');
  const gender = preset.gender || get('gender');
  const sort = get('sort') || preset.sort || 'popular';

  /** Everything the shopper has actively chosen, as removable chips. */
  const chips = useMemo(() => {
    const out = [];
    if (get('category')) out.push({ key: 'category', value: get('category'), label: get('category').replace(/-/g, ' ') });
    MULTI.forEach((k) => list(k).forEach((v) => out.push({ key: k, value: v, label: v })));
    if (get('availability') === 'in') out.push({ key: 'availability', value: 'in', label: 'In stock' });
    const lo = get('minPrice'); const hi = get('maxPrice');
    if (lo || hi) {
      out.push({
        key: '__price', value: '',
        label: lo && hi ? `PKR ${(+lo).toLocaleString()}–${(+hi).toLocaleString()}`
          : lo ? `From PKR ${(+lo).toLocaleString()}` : `Up to PKR ${(+hi).toLocaleString()}`,
      });
    }
    return out;
  }, [params]); // eslint-disable-line

  const removeChip = useCallback((chip) => {
    if (chip.key === '__price') {
      write((n) => { n.delete('minPrice'); n.delete('maxPrice'); });
      return;
    }
    clearOne(chip.key, MULTI.includes(chip.key) ? chip.value : undefined);
  }, [clearOne, write]);

  /** The query string sent to /api/products. */
  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (gender) sp.set('gender', gender);
    if (category) sp.set('category', category);
    if (get('q')) sp.set('q', get('q'));
    // The API matches one value per facet, so the first selection drives the
    // request and the rest are applied client-side. Recorded as debt.
    MULTI.forEach((k) => { const v = list(k); if (v.length) sp.set(k, v[0]); });
    if (get('minPrice')) sp.set('minPrice', get('minPrice'));
    if (get('maxPrice')) sp.set('maxPrice', get('maxPrice'));
    sp.set('sort', sort);
    if (preset.bestSeller) sp.set('bestSeller', 'true');
    if (preset.sale) sp.set('sale', 'true');
    sp.set('limit', '120');
    return sp.toString();
  }, [params, preset, gender, category, sort]); // eslint-disable-line

  return {
    params, get, list, setOne, setMany, toggleMany, clearOne, clearAll,
    chips, removeChip, category, gender, sort, queryString,
    activeCount: chips.length,
  };
}

/** Facets the API cannot express, applied to the returned list. */
export function applyClientFacets(products, { list, get }) {
  if (!products) return products;
  let out = products;

  MULTI.forEach((k) => {
    const chosen = list(k);
    if (chosen.length < 2) return;              // first value already served by the API
    out = out.filter((p) => {
      if (k === 'size') return (p.sizes || []).some((s) => chosen.includes(s));
      if (k === 'color') return (p.colors || []).some((c) => chosen.some((x) => x.toLowerCase() === String(c.name || c).toLowerCase()));
      if (k === 'tier') return chosen.includes(p.tier);
      if (k === 'badge') return (p.badges || []).some((b) => chosen.includes(b));
      if (k === 'fit') return (p.tags || []).some((t) => chosen.some((x) => x.toLowerCase() === String(t).toLowerCase()));
      return true;
    });
  });

  if (get('availability') === 'in') out = out.filter((p) => p.stock > 0);
  return out;
}
