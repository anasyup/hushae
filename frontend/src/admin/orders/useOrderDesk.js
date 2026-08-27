import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useApp } from '../../store/AppContext';

/* ============================================================================
 * Order desk data layer.
 *
 * Filters live in the URL so a filtered view is shareable and survives a
 * refresh. Every mutation goes through `act()` which handles busy state,
 * error surfacing and a targeted refresh.
 * ========================================================================== */

const BASE = '/orders/manage';

export const DEFAULTS = {
  // Opens on All Orders — the desk shows the whole book first, and the
  // Status tabs (Pending / Processing / Completed / Cancelled) narrow it.
  group: 'all', stage: '', status: '', paymentMethod: 'all', paymentState: 'all',
  q: '', from: '', to: '', minTotal: '', maxTotal: '', city: 'all',
  printed: '', hasIssue: '', sort: 'oldest', page: '1', limit: '50',
  preset: '', compare: '',
};

/** Read filters out of the URL, falling back to the defaults. */
function readParams(sp) {
  const out = {};
  for (const [k, v] of Object.entries(DEFAULTS)) out[k] = sp.get(k) ?? v;
  return out;
}

function toQuery(filters) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === '' || v === null || v === undefined) continue;
    if (DEFAULTS[k] === v && ['group', 'paymentMethod', 'paymentState', 'city', 'sort', 'page', 'limit', 'status', 'compare'].includes(k)) {
      // keep defaults out of the URL, but always send them to the API
    }
    p.set(k, v);
  }
  return p.toString();
}

export function useOrderDesk() {
  const { auth, toast } = useApp();
  const token = auth?.token;
  const [sp, setSp] = useSearchParams();

  const filters = useMemo(() => readParams(sp), [sp]);

  const [data, setData] = useState({ orders: [], total: 0, page: 1, pages: 1 });
  const [counts, setCounts] = useState(null);
  const [facets, setFacets] = useState({ cities: [], stages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState(() => new Set());
  const reqId = useRef(0);

  /** Merge a partial filter change into the URL (resets page unless paging). */
  const setFilter = useCallback((patch) => {
    const next = { ...readParams(sp), ...patch };
    if (!('page' in patch)) next.page = '1';
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v === '' || v === null || v === undefined) continue;
      if (v === DEFAULTS[k]) continue;              // keep the URL clean
      p.set(k, String(v));
    }
    setSp(p, { replace: true });
  }, [sp, setSp]);

  const resetFilters = useCallback(() => setSp(new URLSearchParams(), { replace: true }), [setSp]);

  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([k, v]) => !['page', 'limit', 'sort', 'group'].includes(k) && v && v !== DEFAULTS[k]).length,
    [filters],
  );

  // ── Load ────────────────────────────────────────────────────────────────
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!token) return;
    const id = ++reqId.current;
    if (!silent) setLoading(true);
    setError('');
    try {
      const qs = toQuery(filters);
      const [list, cnt] = await Promise.all([
        api(`${BASE}?${qs}`, { token }),
        api(`${BASE}/counts?${qs}`, { token }),
      ]);
      if (id !== reqId.current) return;             // a newer request won
      setData(list);
      setCounts(cnt);
    } catch (e) {
      if (id === reqId.current) setError(e.message || 'Could not load orders');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!token) return;
    api(`${BASE}/facets`, { token }).then(setFacets).catch(() => {});
  }, [token]);

  // ── Mutations ───────────────────────────────────────────────────────────
  const mark = (id, on) => setBusyIds((s) => {
    const n = new Set(s);
    if (on) n.add(id); else n.delete(id);
    return n;
  });

  /**
   * Run a single-order mutation with optimistic busy state.
   * `patch` lets the caller merge the server response into the row in place,
   * avoiding a full refetch for cheap operations.
   */
  const act = useCallback(async (id, fn, { refresh = true, successMsg = '' } = {}) => {
    mark(id, true);
    try {
      const res = await fn();
      if (res?.order) {
        setData((d) => ({ ...d, orders: d.orders.map((o) => (o._id === id ? { ...o, ...res.order } : o)) }));
      }
      if (successMsg) toast?.(successMsg);
      if (refresh) load({ silent: true });
      return res;
    } catch (e) {
      toast?.(e.message || 'Action failed');
      throw e;
    } finally {
      mark(id, false);
    }
  }, [load, toast]);

  const setStage = (id, stage, note = '', cancelReason = '') =>
    act(id, () => api(`${BASE}/${id}/stage`, { method: 'PATCH', token, body: { stage, note, cancelReason } }),
      { successMsg: `Moved to ${stage}` });

  const verifyPayment = (id, state, extra = {}) =>
    act(id, () => api(`${BASE}/${id}/payment/verify`, { method: 'PATCH', token, body: { state, ...extra } }),
      { successMsg: `Payment ${state.toLowerCase()}` });

  const recordPrint = (id, docType) =>
    act(id, () => api(`${BASE}/${id}/print`, { method: 'POST', token, body: { docType } }), { refresh: false });

  const addNote = (id, body) =>
    act(id, () => api(`${BASE}/${id}/note`, { method: 'POST', token, body: { body } }),
      { refresh: false, successMsg: 'Note added' });

  const bulk = useCallback(async (action, ids, payload = {}) => {
    try {
      const res = await api(`${BASE}/bulk`, { method: 'POST', token, body: { action, ids, payload } });
      toast?.(res.failedCount
        ? `${res.okCount} updated · ${res.failedCount} failed`
        : `${res.okCount} order${res.okCount === 1 ? '' : 's'} updated`);
      load({ silent: true });
      return res;
    } catch (e) {
      toast?.(e.message || 'Bulk action failed');
      throw e;
    }
  }, [token, load, toast]);

  const exportCsv = useCallback(() => {
    const qs = toQuery(filters);
    // The endpoint needs the bearer token, so fetch then trigger a download.
    return fetch(`${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api${BASE}/export/csv?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error('Export failed'); return r.blob(); })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hushae-orders-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        toast?.('CSV downloaded');
      })
      .catch((e) => toast?.(e.message || 'Export failed'));
  }, [filters, token, toast]);

  return {
    filters, setFilter, resetFilters, activeFilterCount,
    data, counts, facets, loading, error, busyIds,
    reload: load, setStage, verifyPayment, recordPrint, addNote, bulk, exportCsv,
  };
}

/** Poll the notification feed for the badge + toasts. */
export function useOrderNotifications({ intervalMs = 45000 } = {}) {
  const { auth } = useApp();
  const token = auth?.token;
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    if (!token) return;
    api(`${BASE}/notifications/list?limit=25`, { token })
      .then((d) => { setItems(d.notifications || []); setUnread(d.unread || 0); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    load();
    const t = setInterval(load, intervalMs);
    return () => clearInterval(t);
  }, [load, intervalMs]);

  const markRead = useCallback(async (ids = null) => {
    try {
      await api(`${BASE}/notifications/read`, { method: 'PATCH', token, body: ids ? { ids } : {} });
      load();
    } catch { /* noop */ }
  }, [token, load]);

  return { items, unread, reload: load, markRead };
}
