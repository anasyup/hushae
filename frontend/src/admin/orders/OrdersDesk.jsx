import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Keyboard, Loader2, Plus, RefreshCcw, X } from 'lucide-react';
import AdminLayout from '../AdminLayout';
import PageHeader from '../components/PageHeader';
import { pkr } from '../../lib/format';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { useOrderDesk } from './useOrderDesk';
import { GROUPS, ISSUE_TYPES, REFUND_STATES } from './orderConstants';
import OrderFilters from './OrderFilters';
import BulkBar from './BulkBar';
import OrderRow from './OrderRow';
import QuickFilters from './QuickFilters';
import CustomerPanel from './CustomerPanel';
import { writeErrorWindow, writeLoadingWindow, writePrintWindow } from './printDocument';
import {
  btnGhost, btnSolid, btnIcon, ctl,
  EditorialEmpty, EditorialError, EditorialPagination, TableSkeleton,
} from './orderUi';

/* ===========================================================================
 * Order desk — Phase 03-R editorial recomposition.
 * Functionality unchanged: filters, bulk, print, stage, notifications.
 * ========================================================================== */

export default function OrdersDesk() {
  const { auth, toast } = useApp();
  const nav = useNavigate();
  const desk = useOrderDesk();
  const {
    filters, setFilter, resetFilters, activeFilterCount,
    data, counts, facets, loading, error, busyIds,
    reload, setStage, verifyPayment, bulk, exportCsv,
  } = desk;

  const [selected, setSelected] = useState([]);
    const [serviceFor, setServiceFor] = useState(null);
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [customerPhone, setCustomerPhone] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const orders = data.orders || [];
  const ids = useMemo(() => orders.map((o) => o._id), [orders]);

  useEffect(() => {
    setSelected([]);
    setSelectAllMatching(false);
  }, [filters.group]);

  const toggle = useCallback((id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])), []);
  const allOnPage = orders.length > 0 && selected.length === orders.length;

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

  const canAdvance = useMemo(() => {
    const chosen = orders.filter((o) => selected.includes(o._id));
    if (!chosen.length) return true;
    return chosen.some((o) => (o.allowedNext || []).some(
      (n) => !['Cancelled', 'Refunded', 'Returned', 'Failed Delivery'].includes(n)));
  }, [orders, selected]);

  const group = filters.group || 'all';

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

  const paidCount = (counts?.byPaymentState?.Confirmed || 0) + (counts?.byPaymentState?.Verified || 0);
  const pendingCount = counts?.byGroup?.new ?? counts?.byPaymentState?.Pending ?? 0;
  const fulfilledCount = counts?.byGroup?.delivered ?? 0;

  const metrics = [
    { label: 'Total orders', value: counts ? counts.total : '—' },
    { label: 'Pending', value: counts ? pendingCount : '—' },
    { label: 'Paid', value: counts ? paidCount : '—' },
    { label: 'Fulfilled', value: counts ? fulfilledCount : '—' },
  ];

  return (
    <AdminLayout title="Orders">
      <PageHeader
        title="Orders"
        description="Manage orders, payments and fulfillment."
        actions={(
          <>
            <Link to="/admin/orders/new" className={btnSolid}>
              <Plus size={12} /> Create order
            </Link>
            <button onClick={() => reload()} aria-label="Refresh" className={btnIcon}>
              <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowShortcuts(true)} aria-label="Keyboard shortcuts" className={`${btnIcon} hidden sm:grid`}>
              <Keyboard size={13} />
            </button>
          </>
        )}
      />

      {/* 01 — ORDER OVERVIEW */}
      <section className="mb-10">
        <p className="adm-index">01 — Order overview</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-white/10 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="px-5 py-6">
              <p className="adm-label">{m.label}</p>
              <p className="adm-metric mt-3 text-[32px] leading-none text-white">
                {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
              </p>
            </div>
          ))}
        </div>
        {counts?.revenue != null && (
          <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-white/30">
            {pkr(counts.revenue)} total value
            {loading ? ' · Loading…' : ` · ${data.total} in this view`}
          </p>
        )}
      </section>

      {/* 02 — ORDER WORKSPACE */}
      <section className="mb-10">
        <p className="adm-index">02 — Order workspace</p>
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 pb-px">
          {GROUPS.map((g) => {
            const n = g.key === 'all' ? counts?.total : counts?.byGroup?.[g.key];
            const active = group === g.key;
            return (
              <button
                key={g.key}
                onClick={() => setFilter({ group: g.key, stage: '' })}
                title={g.hint}
                aria-pressed={active}
                className={`shrink-0 px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
                  active
                    ? 'border-b border-white text-white'
                    : 'border-b border-transparent text-white/35 hover:text-white/75'
                }`}
              >
                {g.label}
                {n != null && <span className={`ml-2 tabular-nums ${active ? 'text-white/70' : 'text-white/25'}`}>{n}</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <QuickFilters
            filters={filters} setFilter={setFilter} token={auth?.token}
            currentQuery={window.location.search.replace(/^\?/, '')} toast={toast}
          />
        </div>

        <div className="mt-5">
          <OrderFilters
            filters={filters} setFilter={setFilter} resetFilters={resetFilters}
            activeFilterCount={activeFilterCount} facets={facets} onExport={exportCsv}
            token={auth?.token}
          />
        </div>
      </section>

      {/* 03 — ORDERS */}
      <section className="mb-6">
        <p className="adm-index">03 — Orders</p>

        <BulkBar
          selected={selected} total={data.total}
          onClear={() => { setSelected([]); setSelectAllMatching(false); }}
          onSelectAll={() => { setSelected(ids); setSelectAllMatching(true); }}
          onBulk={bulk} onExport={exportCsv}
          onPrint={handleBulkPrint} canAdvance={canAdvance}
          token={auth?.token} toast={toast}
        />

        {selectAllMatching && data.total > orders.length && (
          <p className="border-b border-white/10 py-2.5 text-[12px] text-white/45">
            All <span className="text-white">{data.total}</span> matching orders are targeted — actions apply beyond this page.
            <button onClick={() => setSelectAllMatching(false)} className="ml-2 text-white/70 underline underline-offset-2 hover:text-white">
              Limit to this page
            </button>
          </p>
        )}

        {error && (
          <EditorialError
            title="Unable to load orders"
            description={error || 'Something prevented the orders from loading.'}
            onRetry={() => reload()}
          />
        )}

        {loading && orders.length === 0 && !error && <TableSkeleton rows={6} />}

        {!loading && orders.length === 0 && !error && (
          <EditorialEmpty
            title="No orders"
            description={activeFilterCount > 0
              ? 'No orders match these filters. Try widening the date range or clearing the search.'
              : 'Orders will appear here when customers complete purchases.'}
            action={activeFilterCount > 0 ? (
              <button onClick={resetFilters} className={btnSolid}>Clear all filters</button>
            ) : (
              <Link to="/admin/orders/new" className={btnGhost}>Create order</Link>
            )}
          />
        )}

        {orders.length > 0 && (
          <div className="min-w-0 overflow-x-hidden">
            <div className="hidden border-b border-white/10 px-1 py-2.5 lg:grid lg:grid-cols-[32px_minmax(0,1.2fr)_minmax(0,1.15fr)_0.5fr_0.9fr_0.85fr_0.95fr_auto] lg:items-center lg:gap-3 xl:grid-cols-[32px_minmax(0,1.15fr)_minmax(0,1.1fr)_0.85fr_0.55fr_0.85fr_0.85fr_0.95fr_0.7fr_auto]">
              <input
                type="checkbox"
                checked={allOnPage}
                onChange={() => setSelected(allOnPage ? [] : ids)}
                aria-label="Select all on this page"
                className="h-3.5 w-3.5 cursor-pointer rounded-none border-white/30 bg-transparent accent-white"
              />
              <p className="adm-label">Order</p>
              <p className="adm-label">Customer</p>
              <p className="adm-label hidden xl:block">Date</p>
              <p className="adm-label">Items</p>
              <p className="adm-label">Total</p>
              <p className="adm-label">Payment</p>
              <p className="adm-label">Fulfillment</p>
              <p className="adm-label hidden xl:block">Status</p>
              <p className="adm-label" />
            </div>
            <div className="flex items-center gap-2 border-b border-white/10 px-1 py-2 lg:hidden">
              <input
                type="checkbox"
                checked={allOnPage}
                onChange={() => setSelected(allOnPage ? [] : ids)}
                aria-label="Select all on this page"
                className="h-3.5 w-3.5 cursor-pointer rounded-none border-white/30 bg-transparent accent-white"
              />
              <span className="text-[11px] text-white/35">Select page</span>
            </div>

            {orders.map((o) => (
              <OrderRow
                key={o._id} order={o}
                selected={selected.includes(o._id)} onSelect={toggle}
                busy={busyIds.has(o._id)}
                onStage={setStage} onVerify={verifyPayment}
                onPrint={handlePrint} onOpenService={setServiceFor}
                onOpenCustomer={setCustomerPhone}
              />
            ))}
          </div>
        )}

        <div className="mt-2">
          <EditorialPagination
            page={data.page}
            pages={data.pages}
            onPage={(p) => setFilter({ page: String(p) })}
          />
        </div>
      </section>

      {customerPhone && (
        <CustomerPanel phone={customerPhone} token={auth?.token} onClose={() => setCustomerPhone(null)} />
      )}

      {showShortcuts && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setShowShortcuts(false)}>
          <div className="w-full max-w-sm border border-white/15 bg-[#0D0D0D] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-white">Shortcuts</p>
              <button onClick={() => setShowShortcuts(false)} className="text-white/35 hover:text-white"><X size={15} /></button>
            </div>
            <dl className="mt-4 space-y-2">
              {[['/', 'Focus search'], ['P', 'Print packing slips'], ['A', 'Advance stage'],
                ['M', 'Mark paid'], ['Esc', 'Clear selection'], ['?', 'This panel']].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[12px]">
                  <dt className="text-white/45">{v}</dt>
                  <dd><kbd className="border border-white/15 px-1.5 py-0.5 font-mono text-[11px] text-white/70">{k}</kbd></dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[11px] text-white/30">Action keys apply to the current selection.</p>
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

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md border border-white/15 bg-[#0D0D0D] p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[14px] font-medium text-white">Log a customer issue</p>
            <p className="mt-0.5 font-mono text-[12px] text-white/35">{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="text-white/35 hover:text-white"><X size={16} /></button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <span className="adm-label mb-1.5 block">Issue type</span>
            <select value={form.issueType} onChange={(e) => setForm({ ...form, issueType: e.target.value })} className={ctl}>
              {ISSUE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <span className="adm-label mb-1.5 block">What happened</span>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the problem for the team" className={`${ctl} py-2`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="adm-label mb-1.5 block">Refund</span>
              <select value={form.refundStatus} onChange={(e) => setForm({ ...form, refundStatus: e.target.value })} className={ctl}>
                {REFUND_STATES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <span className="adm-label mb-1.5 block">Severity</span>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={ctl}>
                {['Low', 'Normal', 'High'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button disabled={busy} onClick={save} className={btnSolid}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : null} Save issue
          </button>
        </div>
      </div>
    </div>
  );
}
