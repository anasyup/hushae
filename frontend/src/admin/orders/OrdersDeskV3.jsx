import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, Download, Filter, Keyboard, Loader2, Plus, RefreshCw, Search, X,
  ChevronDown, ChevronRight, Package, Clock, Truck, CheckCircle2, AlertTriangle,
  Eye, Printer, MoreHorizontal, ArrowUpDown,
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import { pkr, fmtDate } from '../../lib/format';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { useOrderDesk, useOrderNotifications } from './useOrderDesk';
import { GROUPS, ISSUE_TYPES, REFUND_STATES } from './orderConstants';
import OrderFilters from './OrderFilters';
import BulkBar from './BulkBar';
import CustomerPanel from './CustomerPanel';
import { writeErrorWindow, writeLoadingWindow, writePrintWindow } from './printDocument';

/* ============================================================================
 * ORDERS DESK V3 — Phase 11 Blueprint
 * Professional commerce workstation. Operational density.
 * ========================================================================== */

const STAGE_TABS = [
  { key: 'all', label: 'All', icon: Package },
  { key: 'new', label: 'New', icon: Clock },
  { key: 'to-ship', label: 'To Ship', icon: Package },
  { key: 'shipping', label: 'In Transit', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
  { key: 'issues', label: 'Issues', icon: AlertTriangle },
];

const statusBadge = (status) => {
  const map = {
    'Pending': 'v3-status v3-status-pending',
    'Confirmed': 'v3-status v3-status-active',
    'Processing': 'v3-status v3-status-active',
    'Ready to Ship': 'v3-status v3-status-active',
    'Shipped': 'v3-status v3-status-active',
    'Out for Delivery': 'v3-status v3-status-active',
    'Delivered': 'v3-status v3-status-strong',
    'Cancelled': 'v3-status v3-status-inactive',
    'Refunded': 'v3-status v3-status-inactive',
  };
  return map[status] || 'v3-status v3-status-pending';
};

export default function OrdersDesk() {
  const { auth, toast } = useApp();
  const nav = useNavigate();
  const desk = useOrderDesk();
  const notes = useOrderNotifications();
  const {
    filters, setFilter, resetFilters, activeFilterCount,
    data, counts, facets, loading, error, busyIds,
    reload, setStage, verifyPayment, bulk, exportCsv,
  } = desk;

  const [selected, setSelected] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [customerPhone, setCustomerPhone] = useState(null);
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [search, setSearch] = useState('');

  const orders = data.orders || [];
  const ids = useMemo(() => orders.map((o) => o._id), [orders]);

  useEffect(() => { setSelected([]); setSelectAllMatching(false); }, [filters.group]);

  const toggle = useCallback((id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])), []);
  const allOnPage = orders.length > 0 && selected.length === orders.length;

  const toggleAll = () => {
    if (allOnPage) setSelected([]);
    else setSelected(orders.map(o => o._id));
  };

  const openPrintTab = useCallback(async (docType, orderIds) => {
    const win = window.open('', '_blank');
    if (!win) { toast?.('Allow pop-ups for this site to print'); return; }
    writeLoadingWindow(win, 'Preparing documents…');
    try {
      const qs = new URLSearchParams({ doc: docType });
      if (orderIds?.length) qs.set('ids', orderIds.join(','));
      else Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v); });
      const payload = await api(`/orders/manage/print/batch?${qs}`, { token: auth?.token });
      if (!payload.orders?.length) { writeErrorWindow(win, 'There were no orders to print.'); return; }
      writePrintWindow(win, payload);
      const printedIds = payload.orders.map((o) => o._id).slice(0, 200);
      bulk('print', printedIds, { docType }).catch(() => {});
    } catch (e) { writeErrorWindow(win, e.message || 'Could not load the document.'); }
  }, [auth?.token, filters, bulk, toast]);

  // Filtered orders (client-side search)
  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(o =>
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerInfo?.name?.toLowerCase().includes(q) ||
      o.customerInfo?.phone?.includes(q) ||
      o.customerInfo?.email?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const totalOrders = data.total || 0;

  if (error) return (
    <AdminLayout title="Orders">
      <div className="v3-empty" style={{ minHeight: 300 }}>
        <AlertTriangle size={24} className="v3-empty-icon" />
        <p className="v3-empty-title">{error}</p>
        <button onClick={reload} className="v3-btn v3-btn-secondary mt-3">Try again</button>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Orders">
      {/* ── PAGE HEADER ────────────────────────────────────────────────── */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb">
            <Link to="/admin">Home</Link><span>/</span><span>Orders</span>
          </div>
          <h1 className="v3-h-page">Orders</h1>
          <p className="v3-h-small mt-1">{totalOrders} total orders · Manage, process and fulfill customer orders.</p>
        </div>
        <div className="v3-page-header-right">
          <button onClick={reload} disabled={loading} className="v3-btn v3-btn-secondary v3-btn-sm">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => exportCsv(filters)} className="v3-btn v3-btn-secondary v3-btn-sm">
            <Download size={12} /> Export
          </button>
          <Link to="/admin/orders/new" className="v3-btn v3-btn-primary v3-btn-sm">
            <Plus size={12} /> Create Order
          </Link>
        </div>
      </div>

      {/* ── STAGE TABS ─────────────────────────────────────────────────── */}
      <div className="v3-tabs">
        {STAGE_TABS.map(tab => {
          const count = tab.key === 'all' ? totalOrders : (counts?.[tab.key] || 0);
          return (
            <button key={tab.key} onClick={() => setStage(tab.key)}
              className={`v3-tab ${filters.group === tab.key ? 'active' : ''}`}>
              {tab.label}
              {count > 0 && <span className="ml-1.5 text-[10px] font-semibold tabular">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* ── TOOLBAR ────────────────────────────────────────────────────── */}
      <div className="v3-filter-bar">
        <div className="relative flex-1" style={{ maxWidth: 320 }}>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders, customers…"
            className="v3-input"
            style={{ paddingLeft: 30, height: 30, fontSize: 12 }}
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`v3-btn v3-btn-sm ${showFilters || activeFilterCount > 0 ? 'v3-btn-primary' : 'v3-btn-secondary'}`}>
          <Filter size={12} /> Filters
          {activeFilterCount > 0 && <span className="ml-1 bg-white text-[#111] rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={resetFilters} className="v3-btn v3-btn-ghost v3-btn-sm">
            <X size={12} /> Clear
          </button>
        )}
        <div className="v3-toolbar-spacer" />
        {selected.length > 0 && (
          <span className="text-[11px] font-medium text-[#6B7280]">{selected.length} selected</span>
        )}
      </div>

      {/* ── FILTERS PANEL ──────────────────────────────────────────────── */}
      {showFilters && (
        <div className="mb-4 p-4 bg-[#FAFBFC] border border-[#E5E7EB] rounded-[5px]">
          <OrderFilters filters={filters} setFilter={setFilter} facets={facets} />
        </div>
      )}

      {/* ── BULK ACTIONS ───────────────────────────────────────────────── */}
      {selected.length > 0 && (
        <div className="mb-4">
          <BulkBar
            selected={selected}
            allOnPage={allOnPage}
            selectAllMatching={selectAllMatching}
            totalMatching={totalOrders}
            onToggleAll={toggleAll}
            onToggleAllMatching={() => setSelectAllMatching(!selectAllMatching)}
            onClear={() => setSelected([])}
            onBulk={bulk}
            onPrint={openPrintTab}
          />
        </div>
      )}

      {/* ── ORDERS TABLE ───────────────────────────────────────────────── */}
      {loading && !orders.length ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 v3-skeleton rounded-[5px]" />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="v3-card">
          <div className="v3-empty">
            <Package size={24} className="v3-empty-icon" />
            <p className="v3-empty-title">No orders found</p>
            <p className="v3-empty-desc">
              {search ? 'Try a different search term.' : 'Adjust filters or create a new order.'}
            </p>
            {!search && (
              <Link to="/admin/orders/new" className="v3-btn v3-btn-primary mt-3">
                <Plus size={12} /> Create Order
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="v3-card">
          <div className="v3-table-wrap">
            <table className="v3-table dense">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allOnPage} onChange={toggleAll} className="w-3.5 h-3.5 accent-[#111]" />
                  </th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th className="right">Total</th>
                  <th>Date</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => (
                  <OrderRowV3
                    key={o._id}
                    order={o}
                    selected={selected.includes(o._id)}
                    onToggle={() => toggle(o._id)}
                    busy={busyIds?.has(o._id)}
                    onVerify={() => verifyPayment(o._id)}
                    onPrint={(doc) => openPrintTab(doc, [o._id])}
                    onCustomerPanel={() => setCustomerPhone(o.customerInfo?.phone)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="v3-pagination">
              <span>Page {data.page} of {data.pages} · {totalOrders} orders</span>
              <div className="v3-pagination-controls">
                <button disabled={data.page <= 1} onClick={() => setFilter('page', data.page - 1)} className="v3-pagination-btn">←</button>
                {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                  const p = Math.max(1, Math.min(data.pages - 4, data.page - 2)) + i;
                  return <button key={p} onClick={() => setFilter('page', p)} className={`v3-pagination-btn ${p === data.page ? 'active' : ''}`}>{p}</button>;
                })}
                <button disabled={data.page >= data.pages} onClick={() => setFilter('page', data.page + 1)} className="v3-pagination-btn">→</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CUSTOMER PANEL ─────────────────────────────────────────────── */}
      {customerPhone && (
        <>
          <div className="v3-drawer-overlay" onClick={() => setCustomerPhone(null)} />
          <div className="v3-drawer">
            <div className="v3-drawer-header">
              <span className="v3-h-section">Customer</span>
              <button onClick={() => setCustomerPhone(null)} className="v3-btn v3-btn-icon v3-btn-ghost"><X size={16} /></button>
            </div>
            <div className="v3-drawer-body">
              <CustomerPanel phone={customerPhone} />
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

/* ── ORDER ROW V3 ───────────────────────────────────────────────────────── */
function OrderRowV3({ order: o, selected, onToggle, busy, onVerify, onPrint, onCustomerPanel }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <tr className={selected ? 'bg-[#F5F6F8]' : ''}>
      <td>
        <input type="checkbox" checked={selected} onChange={onToggle} className="w-3.5 h-3.5 accent-[#111]" />
      </td>
      <td>
        <Link to={`/admin/orders/${o._id}`} className="text-[13px] font-semibold text-[#111] hover:underline" style={{ textDecoration: 'none' }}>
          {o.orderNumber}
        </Link>
        <div className="flex items-center gap-1.5 mt-0.5">
          {o.items?.length > 0 && (
            <div className="flex -space-x-1">
              {o.items.slice(0, 3).map((it, i) => (
                <img key={i} src={it.image} alt="" className="w-5 h-5 rounded-[2px] border border-white object-cover" />
              ))}
              {o.items.length > 3 && <span className="w-5 h-5 rounded-[2px] bg-[#F0F1F3] text-[8px] font-bold flex items-center justify-center text-[#6B7280]">+{o.items.length - 3}</span>}
            </div>
          )}
          <span className="text-[11px] text-[#9CA3AF]">{o.items?.length || 0} items</span>
        </div>
      </td>
      <td>
        <button onClick={onCustomerPanel} className="text-left hover:underline cursor-pointer bg-transparent border-none p-0">
          <div className="text-[13px] text-[#111]">{o.customerInfo?.name || 'Guest'}</div>
          <div className="text-[11px] text-[#9CA3AF]">{o.customerInfo?.phone || o.customerInfo?.email || ''}</div>
        </button>
      </td>
      <td>
        <span className={statusBadge(o.status)}>
          <span className="v3-status-dot" />
          {o.status}
        </span>
        {o.stage && o.stage !== o.status && (
          <div className="text-[10px] text-[#9CA3AF] mt-0.5">{o.stage}</div>
        )}
      </td>
      <td>
        <div className="text-[12px] text-[#4A4A4A]">{o.paymentMethod}</div>
        <div className="text-[11px] text-[#9CA3AF]">{o.paymentStatus || 'Pending'}</div>
        {o.paymentStatus === 'Pending' && o.paymentMethod !== 'COD' && (
          <button onClick={onVerify} disabled={busy} className="text-[10px] font-medium text-[#111] underline mt-0.5">Verify</button>
        )}
      </td>
      <td className="right">
        <span className="text-[13px] font-semibold tabular">{pkr(o.total)}</span>
        {o.discount > 0 && <div className="text-[10px] text-[#9CA3AF] tabular">-{pkr(o.discount)}</div>}
      </td>
      <td>
        <div className="text-[12px] text-[#4A4A4A]">{fmtDate(o.createdAt)}</div>
        <div className="text-[11px] text-[#9CA3AF]">{o.customerInfo?.city || ''}</div>
      </td>
      <td>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="v3-btn v3-btn-icon v3-btn-ghost sm" disabled={busy}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <MoreHorizontal size={14} />}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E5E7EB] rounded-[5px] py-1 z-50" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <Link to={`/admin/orders/${o._id}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#4A4A4A] hover:bg-[#F5F6F8]">
                  <Eye size={13} /> View Details
                </Link>
                <button onClick={() => { onPrint('invoice'); setMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#4A4A4A] hover:bg-[#F5F6F8] w-full text-left">
                  <Printer size={13} /> Print Invoice
                </button>
                <button onClick={() => { onPrint('shipping'); setMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#4A4A4A] hover:bg-[#F5F6F8] w-full text-left">
                  <Printer size={13} /> Print Shipping
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
