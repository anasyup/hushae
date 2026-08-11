import { api } from '../api/client';

/* ============================================================================
 * Shared catalogue lookups (categories + collections) fetched ONCE per page
 * load and cached at module level — every card / pill / sub-nav reuses the
 * same promises, so there is exactly one request per list.
 * ========================================================================== */

let catsP = null;
let collsP = null;

export const fetchCats = () =>
  catsP || (catsP = api('/categories').then((d) => d.categories || []).catch(() => []));

export const fetchCollections = () =>
  collsP || (collsP = api('/collections').then((d) => (Array.isArray(d) ? d : d.collections || [])).catch(() => []));
