import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Keyboard, Loader2, Plus, RefreshCcw, X } from 'lucide-react';
import './orders-desk.css';
import {
  CalendarDays, CheckCircle2, Clock, Package, XCircle, Banknote, Download,
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import PageHeader from '../components/PageHeader';
import { pkr } from '../../lib/format';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { useOrderDesk } from './useOrderDesk';
import PaginationBar from '../PaginationBar';
import '../products-atelier.css';
import { GROUPS, ISSUE_TYPES, REFUND_STATES } from './orderConstants';
import OrderFilters from './OrderFilters';
import TrackingModal from './TrackingModal';
import BulkBar from './BulkBar';
import OrderRow from './OrderRow';
import QuickFilters from './QuickFilters';
import CustomerPanel from './CustomerPanel';
import { writeErrorWindow, writeLoadingWindow, writePrintWindow } from './printDocument';
import {
  btnGhost, btnSolid, btnIcon, ctl,
  EditorialEmpty, EditorialError, TableSkeleton,
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
    reload, setStage, verifyPayment, bulk, exportCsv, saveTracking,
  } = desk;

  const [selected, setSelected] = useState([]);
    const [serviceFor, setServiceFor] = useState(null);
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [customerPhone, setCustomerPhone] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [viewsPop, setViewsPop] = useState(false);

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

  /* Tracking-at-ship: moving an order into the courier pipeline without a
     tracking number opens the modal first. Skipping never blocks the stage —
     a stuck pipeline costs more than a missing number. */
  const [trackReq, setTrackReq] = useState(null);
  const [trackBusy, setTrackBusy] = useState(false);
  const SHIP_STAGES = ['To Handover', 'Shipped', 'In Transit', 'Out for Delivery'];

  const handleStage = (id, stage, note = '', reason = '') => {
    if (SHIP_STAGES.includes(stage)) {
      const o = orders.find((x) => x._id === id);
      if (o && !o.trackingNumber) { setTrackReq({ order: o, stage, note, reason }); return; }
    }
    setStage(id, stage, note, reason);
  };

  const submitTracking = async ({ courier, tracking, skip }) => {
    const { order, stage, note, reason } = trackReq;
    setTrackReq(null);
    setTrackBusy(true);
    try {
      if (!skip && (tracking || courier)) {
        await saveTracking(order._id, { courier, tracking });
      }
      if (stage) setStage(order._id, stage, note, reason);
    } catch { /* act() already toasted */ }
    setTrackBusy(false);
  };

  const pct = (cur, prev) => {
    if (!prev) return null;
    const v = ((cur - prev) / prev) * 100;
    return `${v >= 0 ? '↑' : '↓'} ${Math.abs(v).toFixed(1)}%`;
  };

  const trend = counts?.trend;
  const prev = counts?.prev;
  const cur = counts?.cur;
  const stats = [
    { label: 'Total Orders', icon: CalendarDays, go: 'all', val: counts?.total, series: trend?.total, c: cur?.total, p: prev?.total, color: 'var(--od-text)' },
    { label: 'Pending', icon: Clock, go: 'new', val: counts?.byGroup?.new, series: trend?.pending, c: cur?.pending, p: prev?.pending, color: '#f59e0b' },
    { label: 'Processing', icon: Package, go: 'processing', val: (counts?.byGroup?.processing || 0) + (counts?.byGroup?.['to-ship'] || 0), series: trend?.processing, c: cur?.processing, p: prev?.processing, color: '#8b5cf6' },
    { label: 'Completed', icon: CheckCircle2, go: 'delivered', val: counts?.byGroup?.delivered, series: trend?.completed, c: cur?.completed, p: prev?.completed, color: '#0e9f6e' },
    { label: 'Cancelled', icon: XCircle, go: 'issues', val: counts?.byGroup?.issues, series: trend?.cancelled, c: cur?.cancelled, p: prev?.cancelled, color: '#ef4444' },
    { label: 'Revenue', icon: Banknote, go: '@reports', val: counts?.revenue != null ? pkr(counts.revenue) : null, series: trend?.revenue, c: cur?.revenue, p: prev?.revenue, color: '#1e40af' },
  ];

  return (
    <AdminLayout title="Orders">
      <div className="od">
        {/* ── page head ── */}
        <div className="od-head">
          <div>
            <h1 className="od-title">Orders</h1>
            <p className="od-sub">
              {loading ? 'Loading…' : `${data.total} orders in view${counts?.revenue != null ? ` · ${pkr(counts.revenue)} total value` : ''}`}
            </p>
          </div>
          <div className="od-head-right">
            <div className="od-dates" role="group" aria-label="Quick date range">
              {[
                ['Today', 0], ['7 days', 6], ['30 days', 29], ['All', null],
              ].map(([lbl, days]) => {
                const from = days == null ? '' : new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
                const active = (filters.from || '') === from;
                return (
                  <button key={lbl} type="button" className={`od-date ${active ? 'active' : ''}`}
                    onClick={() => setFilter({ from })}>
                    {lbl}
                  </button>
                );
              })}
            </div>
            <Link to="/admin/orders/new" className="od-btn-black"><Plus size={11} /> Add Order</Link>
            <button type="button" onClick={() => reload()} className="od-icon-btn" aria-label="Refresh" title="Refresh">
              <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={() => setShowShortcuts(true)} className="od-icon-btn" aria-label="Keyboard shortcuts" title="Shortcuts (?)">
              <Keyboard size={13} />
            </button>
          </div>
        </div>

        {/* ── stat cards with real 7-day sparklines ── */}
        <div className="od-stats">
          {stats.map((m) => {
            const Icon = m.icon;
            const ch = m.c != null && m.p != null ? pct(m.c, m.p) : null;
            return (
              <button
                key={m.label}
                type="button"
                className="od-stat"
                title={m.go === '@reports' ? 'Open sales reports' : `Filter: ${m.label}`}
                onClick={() => (m.go === '@reports' ? nav('/admin/reports') : setFilter({ group: m.go, stage: '' }))}
              >
                <div className="od-stat-head"><Icon /> {m.label}</div>
                <div className="od-stat-val">{typeof m.val === 'number' ? m.val.toLocaleString() : m.val ?? '—'}</div>
                <div className="od-stat-foot">
                  <div>
                    {ch && <div className={`od-stat-change ${ch.startsWith('↓') ? 'down' : ''}`}>{ch}</div>}
                    <div className="od-stat-vs">vs previous 7 days</div>
                  </div>
                  {m.series && <Spark data={m.series} color={m.color} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── main card ── */}
        <div className="od-card">
          <div className="od-card-h">
            <div className="od-tabs">
              {GROUPS.map((g) => {
                const n = g.key === 'all' ? counts?.total : counts?.byGroup?.[g.key];
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setFilter({ group: g.key, stage: '' })}
                    title={g.hint}
                    aria-pressed={group === g.key}
                    className={`od-tab ${group === g.key ? 'active' : ''}`}
                  >
                    {g.label}
                    {n != null && <span className="count">{n}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="od-btn-sm" onClick={exportCsv}><Download size={11} /> Export</button>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <OrderFilters
              filters={filters} setFilter={setFilter} resetFilters={resetFilters}
              activeFilterCount={activeFilterCount} facets={facets} onExport={exportCsv}
              token={auth?.token}
              viewsSlot={(
                <div style={{ position: 'relative' }}>
                  <button type="button" className={`od-fbtn ${viewsPop ? 'active' : ''}`}
                    aria-expanded={viewsPop} onClick={() => setViewsPop((v) => !v)}>
                    Views
                  </button>
                  {viewsPop && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setViewsPop(false)} />
                      <div className="od-pop">
                        <QuickFilters
                          filters={filters} setFilter={setFilter} token={auth?.token}
                          currentQuery={window.location.search.replace(/^\?/, '')} toast={toast}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            />
          </div>

          {counts?.byPaymentState?.Pending > 0 && (
            <div className="od-callout">
              <span className="od-callout-dot" aria-hidden="true" />
              <span>
                <b>{counts.byPaymentState.Pending}</b> order{counts.byPaymentState.Pending === 1 ? '' : 's'} awaiting payment verification — COD calls pending.
              </span>
              <Link to="/admin/verification-queue" className="od-callout-btn">Open queue</Link>
            </div>
          )}

          <BulkBar
            selected={selected} total={data.total}
            onClear={() => { setSelected([]); setSelectAllMatching(false); }}
            onSelectAll={() => { setSelected(ids); setSelectAllMatching(true); }}
            onBulk={bulk} onExport={exportCsv}
            onPrint={handleBulkPrint} canAdvance={canAdvance}
            token={auth?.token} toast={toast}
          />

          {selectAllMatching && data.total > orders.length && (
            <p style={{ fontSize: 12, color: 'var(--od-muted)', padding: '8px 0', borderBottom: '1px solid var(--od-border-light)' }}>
              All <b style={{ color: 'var(--od-text)' }}>{data.total}</b> matching orders are targeted — actions apply beyond this page.
              <button type="button" onClick={() => setSelectAllMatching(false)} style={{ marginLeft: 8, border: 0, background: 'transparent', color: 'var(--od-text)', textDecoration: 'underline', cursor: 'pointer' }}>
                Limit to this page
              </button>
            </p>
          )}

          {error && (
            <div className="od-empty">
              <XCircle size={22} style={{ color: 'var(--od-muted)', margin: '0 auto' }} />
              <p className="od-empty-t">Unable to load orders</p>
              <p className="od-empty-b">{error}</p>
              <button type="button" className="od-btn-sm primary" onClick={() => reload()} style={{ margin: '12px auto 0' }}>Retry</button>
            </div>
          )}

          {loading && orders.length === 0 && !error && (
            <div className="od-table-wrap">
              <table className="od-tbl" aria-label="Loading orders">
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td><div className="od-skel" style={{ width: 14, height: 14 }} /></td>
                      <td><div className="od-skel" style={{ width: '70%' }} /></td>
                      <td><div className="od-skel" style={{ width: '80%' }} /></td>
                      <td><div className="od-skel" style={{ width: '60%' }} /></td>
                      <td><div className="od-skel" style={{ width: 70 }} /></td>
                      <td><div className="od-skel" style={{ width: 60 }} /></td>
                      <td><div className="od-skel" style={{ width: 70 }} /></td>
                      <td><div className="od-skel" style={{ width: 60 }} /></td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && orders.length === 0 && !error && (
            <div className="od-empty">
              <Package size={22} style={{ color: 'var(--od-muted)', margin: '0 auto' }} />
              <p className="od-empty-t">No orders</p>
              <p className="od-empty-b">
                {activeFilterCount > 0 ? 'No orders match these filters. Try widening the range or clearing the search.' : 'Orders will appear here when customers complete purchases.'}
              </p>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                {activeFilterCount > 0
                  ? <button type="button" className="od-btn-sm primary" onClick={resetFilters}>Clear all filters</button>
                  : <Link to="/admin/orders/new" className="od-btn-sm">Create order</Link>}
              </div>
            </div>
          )}

          {orders.length > 0 && (
            <div className="od-table-wrap">
              <table className="od-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>
                      <input
                        type="checkbox"
                        checked={allOnPage}
                        onChange={() => setSelected(allOnPage ? [] : ids)}
                        aria-label="Select all on this page"
                        style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--od-black)' }}
                      />
                    </th>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Fulfillment</th>
                    <th>Total</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <OrderRow
                      key={o._id} order={o}
                      selected={selected.includes(o._id)} onSelect={toggle}
                      busy={busyIds.has(o._id)}
                      onStage={handleStage} onVerify={verifyPayment}
                      onPrint={handlePrint} onOpenService={setServiceFor}
                      onOpenCustomer={setCustomerPhone}
                      onOpenTracking={(ord) => setTrackReq({ order: ord })}
                      onOpen={() => nav(`/admin/orders/${o._id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <PaginationBar
              page={data.page}
              pages={data.pages}
              total={data.total}
              per={Number(filters.limit) || 50}
              onPage={(pg) => setFilter({ page: String(pg) })}
              onPer={(v) => setFilter({ limit: String(v) })}
            />
          </div>
        </div>
      </div>

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
      {trackReq && (
        <TrackingModal
          order={trackReq.order}
          stageLabel={trackReq.stage || ''}
          busy={trackBusy}
          onSubmit={submitTracking}
          onClose={() => setTrackReq(null)}
        />
      )}
    </AdminLayout>
  );
}

function Spark({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const W = 70; const H = 26;
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * W).toFixed(1)},${(H - 3 - ((v - min) / Math.max(1, max - min)) * (H - 6)).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="od-spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
