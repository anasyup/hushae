import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, Bell, ChevronLeft, ChevronRight, Inbox, Keyboard,
  Loader2, Plus, RefreshCcw, TrendingUp, X,
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import { pkr } from '../../lib/format';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { useOrderDesk, useOrderNotifications } from './useOrderDesk';
import { GROUPS, ISSUE_TYPES, REFUND_STATES, STAGE_MAP } from './orderConstants';
import OrderFilters from './OrderFilters';
import BulkBar from './BulkBar';
import OrderRow from './OrderRow';
import QuickFilters from './QuickFilters';
import CustomerPanel from './CustomerPanel';
import OrderQuickView from '../OrderQuickView';
import { writeErrorWindow, writeLoadingWindow, writePrintWindow } from './printDocument';

/* ============================================================================
 * Order desk — the enhanced /admin/orders screen.
 *
 * Keeps the workflow-first spirit of the original: stage tabs first, compact
 * cards, contextual actions. Adds selection, deep filtering, print tracking,
 * customer service and analytics on top.
 * ========================================================================== */

export default function OrdersDesk() {
  const { auth, toast } = useApp();
  const nav = useNavigate();
  const desk = useOrderDesk();
  const notes = useOrderNotifications();
  const {
    filters, setFilter, resetFilters, activeFilterCount,
    data, counts, facets, loading, error, busyIds,
    reload, setStage, verifyPayment, recordPrint, bulk, exportCsv,
  } = desk;

  const [selected, setSelected] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [quickViewId, setQuickViewId] = useState(null);
  const [serviceFor, setServiceFor] = useState(null);
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [customerPhone, setCustomerPhone] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const orders = data.orders || [];
  const ids = useMemo(() => orders.map((o) => o._id), [orders]);

  // Selection clears when the tab changes, but survives filter and sort tweaks.
  useEffect(() => {
    setSelected([]);
    setSelectAllMatching(false);
  }, [filters.group]);

  const toggle = useCallback((id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])), []);
  const allOnPage = orders.length > 0 && selected.length === orders.length;

  /**
   * Print in a separate tab so the dashboard is never interrupted and the
   * merchant can reprint from that tab as often as they like.
   *
   * The window is opened synchronously inside the click handler — opening it
   * after the await would trip the popup blocker.
   */
  const openPrintTab = useCallback(async (docType, orderIds) => {
    const win = window.open('', '_blank');
    if (!win) {
      toast?.('Allow pop-ups for this site to print');
      return;
    }
    writeLoadingWindow(win, 'Preparing documents…');

    try {
      const qs = new URLSearchParams({ doc: docType });
      if (orderIds?.length) qs.set('ids', orderIds.join(','));
      else Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v); });

      const payload = await api(`/orders/manage/print/batch?${qs}`, { token: auth?.token });
      if (!payload.orders?.length) {
        writeErrorWindow(win, 'There were no orders to print.');
        return;
      }
      writePrintWindow(win, payload);

      // Record the print run without blocking the tab.
      const printedIds = payload.orders.map((o) => o._id).slice(0, 200);
      bulk('print', printedIds, { docType }).catch(() => {});
    } catch (e) {
      writeErrorWindow(win, e.message || 'Could not load the documents.');
      toast?.(e.message || 'Print failed');
    }
  }, [auth?.token, filters, bulk, toast]);

  const handlePrint = useCallback((order, docType) => openPrintTab(docType, [order._id]), [openPrintTab]);

  const handleBulkPrint = useCallback(
    (docType) => openPrintTab(docType, selectAllMatching ? null : selected),
    [openPrintTab, selected, selectAllMatching],
  );

  // Advance is pointless when nothing selected can move forward.
  const canAdvance = useMemo(() => {
    const chosen = orders.filter((o) => selected.includes(o._id));
    if (!chosen.length) return true;                 // select-all-matching case
    return chosen.some((o) => (o.allowedNext || []).some(
      (n) => !['Cancelled', 'Refunded', 'Returned', 'Failed Delivery'].includes(n)));
  }, [orders, selected]);

  const group = filters.group || 'all';

  // Keyboard shortcuts — the desk is a high-volume screen, so the common
  // actions are one key away. Ignored while typing in a field.
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA'
        || el?.tagName === 'SELECT' || el?.isContentEditable;

      if (e.key === '/' && !typing) {
        e.preventDefault();
        document.querySelector('[data-order-search]')?.focus();
        return;
      }
      if (e.key === 'Escape') { setSelected([]); setSelectAllMatching(false); setShowShortcuts(false); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') { setShowShortcuts((v) => !v); return; }
      if (!selected.length) return;

      const k = e.key.toLowerCase();
      if (k === 'p') { e.preventDefault(); handleBulkPrint('packing_slip'); }
      if (k === 'a') { e.preventDefault(); bulk('approve', selected).then(() => setSelected([])); }
      if (k === 'm') { e.preventDefault(); bulk('mark-paid', selected).then(() => setSelected([])); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, bulk, handleBulkPrint]);

  return (
    <AdminLayout title="Orders">
      <div className="space-y-4">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[16px] font-semibold text-neutral-900">Orders</h1>
            <p className="mt-0.5 text-[13px] text-neutral-500">
              {loading ? 'Loading…' : `${data.total} order${data.total === 1 ? '' : 's'}`}
              {counts ? ` · ${pkr(counts.revenue)} total value` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/orders/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black"
              title="Create an order for a customer who ordered by phone or WhatsApp"
            >
              <Plus size={14} /> Create order
            </Link>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400"
            >
              <TrendingUp size={14} /> Analytics
            </Link>

            <div className="relative">
              <button onClick={() => { setShowNotes((v) => !v); if (!showNotes) notes.markRead(); }}
                aria-label="Notifications"
                className="relative grid h-9 w-9 place-items-center rounded-lg border border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400">
                <Bell size={15} />
                {notes.unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[13px] font-bold text-white">
                    {notes.unread > 9 ? '9+' : notes.unread}
                  </span>
                )}
              </button>
              {showNotes && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowNotes(false)} />
                  <div className="absolute right-0 top-11 z-40 max-h-96 w-80 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
                      <p className="text-[13px] font-semibold">Notifications</p>
                      <button onClick={() => setShowNotes(false)} className="text-neutral-400 hover:text-neutral-900"><X size={14} /></button>
                    </div>
                    {notes.items.length === 0 && <p className="p-6 text-center text-xs text-neutral-400">Nothing yet</p>}
                    {notes.items.map((n) => (
                      <button key={n._id} onClick={() => { if (n.link) nav(n.link); setShowNotes(false); }}
                        className="flex w-full gap-2.5 border-b border-neutral-50 px-3 py-2.5 text-left hover:bg-neutral-50">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          n.severity === 'danger' ? 'bg-red-500' : n.severity === 'warning' ? 'bg-amber-500'
                            : n.severity === 'success' ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-medium text-neutral-900">{n.title}</span>
                          {n.body && <span className="block truncate text-[13px] text-neutral-500">{n.body}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button onClick={() => reload()} aria-label="Refresh"
              className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400">
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── Stage tabs ─────────────────────────────────────────────────── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {GROUPS.map((g) => {
            const n = g.key === 'all' ? counts?.total : counts?.byGroup?.[g.key];
            const active = group === g.key;
            return (
              <button key={g.key} onClick={() => setFilter({ group: g.key, stage: '' })} title={g.hint}
                aria-pressed={active}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium transition ${
                  active ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                }`}>
                <g.icon size={14} /> {g.label}
                {n != null && (
                  <span className={`rounded-full px-1.5 text-[12px] font-bold ${active ? 'bg-white/20' : 'bg-neutral-100 text-neutral-600'}`}>{n}</span>
                )}
              </button>
            );
          })}
        </div>

        <QuickFilters
          filters={filters} setFilter={setFilter} token={auth?.token}
          currentQuery={window.location.search.replace(/^\?/, '')} toast={toast}
        />

        <OrderFilters
          filters={filters} setFilter={setFilter} resetFilters={resetFilters}
          activeFilterCount={activeFilterCount} facets={facets} onExport={exportCsv}
          token={auth?.token}
        />

        <BulkBar
          selected={selected} total={data.total}
          onClear={() => { setSelected([]); setSelectAllMatching(false); }}
          onSelectAll={() => { setSelected(ids); setSelectAllMatching(true); }}
          onBulk={bulk} onExport={exportCsv}
          onPrint={handleBulkPrint} canAdvance={canAdvance}
          token={auth?.token} toast={toast}
        />

        {selectAllMatching && data.total > orders.length && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            All <strong>{data.total}</strong> matching orders are targeted — actions apply beyond this page.
            <button onClick={() => setSelectAllMatching(false)} className="ml-2 font-semibold underline">
              Limit to this page
            </button>
          </p>
        )}

        {/* ── Select-all row ─────────────────────────────────────────────── */}
        {orders.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 px-1 text-[12px] text-neutral-500">
            <input type="checkbox" checked={allOnPage} onChange={() => setSelected(allOnPage ? [] : ids)}
              className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-neutral-900" />
            Select all on this page
          </label>
        )}

        {/* ── List ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle size={18} className="shrink-0 text-red-600" />
            <p className="flex-1 text-[13px] text-red-800">{error}</p>
            <button onClick={() => reload()} className="rounded-md bg-red-600 px-3 py-1.5 text-[12px] font-semibold text-white">Retry</button>
          </div>
        )}

        {loading && orders.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-100" />
            ))}
          </div>
        )}

        {!loading && orders.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-neutral-300 py-16 text-center">
            <Inbox size={28} className="mx-auto text-neutral-300" />
            <p className="mt-3 text-[12px] font-medium text-neutral-700">No orders match these filters</p>
            <p className="mt-1 text-[12px] text-neutral-500">Try widening the date range or clearing the search.</p>
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white">
                Clear all filters
              </button>
            )}
          </div>
        )}

        <div className="space-y-2">
          {orders.map((o) => (
            <OrderRow
              key={o._id} order={o}
              selected={selected.includes(o._id)} onSelect={toggle}
              busy={busyIds.has(o._id)}
              onStage={setStage} onVerify={verifyPayment}
              onPrint={handlePrint} onOpenService={setServiceFor}
              onOpenCustomer={setCustomerPhone}
              onQuickView={(o) => setQuickViewId(o._id)}
            />
          ))}
        </div>

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {data.pages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-[12px] text-neutral-500">Page {data.page} of {data.pages}</p>
            <div className="flex gap-1.5">
              <button disabled={data.page <= 1} onClick={() => setFilter({ page: String(data.page - 1) })}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-[13px] font-medium disabled:opacity-40">
                <ChevronLeft size={13} /> Previous
              </button>
              <button disabled={data.page >= data.pages} onClick={() => setFilter({ page: String(data.page + 1) })}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-[13px] font-medium disabled:opacity-40">
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {customerPhone && (
        <CustomerPanel phone={customerPhone} token={auth?.token} onClose={() => setCustomerPhone(null)} />
      )}
      {quickViewId && (
        <OrderQuickView id={quickViewId} token={auth?.token} onClose={() => setQuickViewId(null)} />
      )}

      {showShortcuts && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setShowShortcuts(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-[12px] font-semibold"><Keyboard size={15} /> Shortcuts</p>
              <button onClick={() => setShowShortcuts(false)} className="text-neutral-400 hover:text-neutral-900"><X size={15} /></button>
            </div>
            <dl className="mt-3 space-y-1.5">
              {[['/', 'Focus search'], ['P', 'Print packing slips'], ['A', 'Advance stage'],
                ['M', 'Mark paid'], ['Esc', 'Clear selection'], ['?', 'This panel']].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[12px]">
                  <dt className="text-neutral-600">{v}</dt>
                  <dd><kbd className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-[12px]">{k}</kbd></dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[13px] text-neutral-400">Action keys apply to the current selection.</p>
          </div>
        </div>
      )}

      {serviceFor && (
        <IssueModal order={serviceFor} token={auth?.token} toast={toast}
          onClose={() => setServiceFor(null)} onSaved={() => { setServiceFor(null); reload({ silent: true }); }} />
      )}
    </AdminLayout>
  );
}

/* ── Log-an-issue modal ─────────────────────────────────────────────────── */
function IssueModal({ order, token, toast, onClose, onSaved }) {
  const [form, setForm] = useState({
    issueType: 'Damaged', description: '', severity: 'Normal',
    refundStatus: 'No Issue', refundAmount: 0,
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api(`/orders/manage/${order._id}/issue`, { method: 'POST', token, body: form });
      toast?.('Issue logged');
      onSaved();
    } catch (e) {
      toast?.(e.message || 'Could not save');
      setBusy(false);
    }
  };

  const field = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] font-semibold text-neutral-900">Log a customer issue</p>
            <p className="mt-0.5 font-mono text-[12px] text-neutral-500">{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900"><X size={16} /></button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Issue type</span>
            <select value={form.issueType} onChange={(e) => setForm({ ...form, issueType: e.target.value })} className={field}>
              {ISSUE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-neutral-500">What happened</span>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the problem for the team" className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Refund</span>
              <select value={form.refundStatus} onChange={(e) => setForm({ ...form, refundStatus: e.target.value })} className={field}>
                {REFUND_STATES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Severity</span>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={field}>
                {['Low', 'Normal', 'High'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-neutral-300 px-3.5 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50">
            Cancel
          </button>
          <button disabled={busy} onClick={save}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-50">
            {busy ? <Loader2 size={13} className="animate-spin" /> : null} Save issue
          </button>
        </div>
      </div>
    </div>
  );
}
