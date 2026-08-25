import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Filter, Search, Users, X, ChevronRight, Mail, Phone } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * CUSTOMERS — Video Pages Rebuild: Human-First Directory
 * Dense table, segments, search, Customer 360 navigation
 * ========================================================================== */

const SEGMENTS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'repeat', label: 'Repeat' },
  { key: 'vip', label: 'VIP' },
  { key: 'high_value', label: 'High Value' },
  { key: 'inactive', label: 'Inactive' },
];

const when = (value) => (value ? fmtDate(value) : '—');

function statusBadge(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'ACTIVE' || s === 'VERIFIED') return 'v3-status v3-status-active';
  if (s === 'SUSPENDED' || s === 'DELETED') return 'v3-status v3-status-inactive';
  return 'v3-status v3-status-pending';
}

function segmentBadge(seg) {
  if (!seg) return null;
  const s = seg.toLowerCase();
  if (s === 'vip') return 'v3-status v3-status-strong';
  if (s === 'repeat' || s === 'high_value') return 'v3-status v3-status-active';
  if (s === 'inactive') return 'v3-status v3-status-inactive';
  return 'v3-status v3-status-pending';
}

export default function Customers() {
  const { auth, toast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [directory, setDirectory] = useState(null);
  const [segmentCounts, setSegmentCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);

  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams.toString()]);
  const currentSegment = params.segment || 'all';
  const page = Number(params.page || 1);

  const setFilter = useCallback((patch = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || v === 'all') next.delete(k);
      else next.set(k, String(v));
    });
    if (!Object.prototype.hasOwnProperty.call(patch, 'page')) next.delete('page');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [data, audience] = await Promise.all([
        api(`/customers?${searchParams.toString()}`, { token: auth?.token, noCache: true }),
        api('/customers/segments', { token: auth?.token, noCache: true }).catch(() => ({ segments: null })),
      ]);
      setDirectory(data);
      setSegmentCounts(audience.segments || null);
    } catch (err) {
      setDirectory({ customers: [], total: 0, page: 1, pages: 1 });
      setError(err?.message || 'Customer directory could not load.');
    }
    setLoading(false);
  }, [auth?.token, searchParams.toString()]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSearch(searchParams.get('search') || ''); }, [searchParams.toString()]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const existing = searchParams.get('search') || '';
      if (search.trim() !== existing) setFilter({ search: search.trim() });
    }, 280);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line

  const customers = directory?.customers || [];
  const total = directory?.total || 0;
  const pages = directory?.pages || 1;
  const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  const exportCustomers = async () => {
    try {
      const exportParams = new URLSearchParams(searchParams);
      exportParams.delete('page'); exportParams.delete('limit');
      const res = await fetch(`${BASE}/api/customers/export?${exportParams.toString()}`, {
        headers: { Authorization: `Bearer ${auth?.token || ''}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'hushae-customers.csv'; a.click();
      URL.revokeObjectURL(url);
      toast('Export downloaded');
    } catch (e) { toast(e.message || 'Export failed'); }
  };

  return (
    <AdminLayout title="Customers">
      {/* Header */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb"><Link to="/admin">Home</Link><span>/</span><span>Customers</span></div>
          <h1 className="v3-h-page">Customers</h1>
          <p className="v3-h-small mt-1">{total.toLocaleString()} customers · Click any customer to view their full profile.</p>
        </div>
        <div className="v3-page-header-right">
          <button onClick={exportCustomers} className="v3-btn v3-btn-secondary v3-btn-sm"><Download size={12} /> Export</button>
          <Link to="/admin/customers/groups" className="v3-btn v3-btn-secondary v3-btn-sm"><Users size={12} /> Groups</Link>
        </div>
      </div>

      {/* Segment Tabs */}
      <div className="v3-tabs">
        {SEGMENTS.map(s => {
          const count = s.key === 'all' ? total : (segmentCounts?.[s.key] || 0);
          return (
            <button key={s.key} onClick={() => setFilter({ segment: s.key })} className={`v3-tab ${currentSegment === s.key ? 'active' : ''}`}>
              {s.label}
              {count > 0 && <span className="ml-1.5 text-[10px] font-semibold tabular">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="v3-filter-bar">
        <div className="relative flex-1" style={{ maxWidth: 320 }}>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone, order#…" className="v3-input" style={{ paddingLeft: 30, height: 30, fontSize: 12 }} />
        </div>
        {search && <button onClick={() => { setSearch(''); setFilter({ search: '' }); }} className="v3-btn v3-btn-ghost v3-btn-sm"><X size={12} /> Clear</button>}
      </div>

      {/* Error */}
      {error && (
        <div className="v3-card mb-4">
          <div className="v3-empty" style={{ padding: '24px' }}>
            <p className="v3-empty-title">{error}</p>
            <button onClick={load} className="v3-btn v3-btn-secondary v3-btn-sm mt-2">Try again</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 v3-skeleton rounded-[5px]" />)}</div>
      ) : customers.length === 0 ? (
        <div className="v3-card">
          <div className="v3-empty">
            <Users size={24} className="v3-empty-icon" />
            <p className="v3-empty-title">{search ? 'No customers match your search' : 'No customers found'}</p>
            <p className="v3-empty-desc">{search ? 'Try a different search term or clear filters.' : 'Customers will appear here when they place orders or create accounts.'}</p>
          </div>
        </div>
      ) : (
        <div className="v3-card">
          <div className="v3-table-wrap">
            <table className="v3-table dense">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th className="right">Orders</th>
                  <th className="right">Revenue</th>
                  <th className="right">AOV</th>
                  <th>Segment</th>
                  <th>Last Order</th>
                  <th>Status</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/admin/customers/${c.id}`} className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
                        <div className="w-7 h-7 rounded-[4px] bg-[#F0F1F3] flex items-center justify-center text-[10px] font-bold text-[#6B7280] flex-shrink-0">
                          {(c.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#111] truncate">{c.name || '—'}</p>
                          <p className="text-[10px] text-[#9CA3AF] font-mono truncate">{c.id?.slice(0, 12)}</p>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <div className="text-[12px] text-[#4A4A4A] truncate">{c.email || '—'}</div>
                      <div className="text-[11px] text-[#9CA3AF]">{c.phone || c.whatsApp || '—'}</div>
                    </td>
                    <td className="right tabular text-[13px] font-medium">{c.metrics?.orders || 0}</td>
                    <td className="right tabular text-[13px] font-medium">{pkr(c.metrics?.ltv || 0)}</td>
                    <td className="right tabular text-[12px] text-[#6B7280]">{c.metrics?.orders ? pkr(c.metrics?.aov || 0) : '—'}</td>
                    <td>
                      {c.engagement?.label && (
                        <span className={segmentBadge(c.engagement.label)}>
                          {c.engagement.label}
                        </span>
                      )}
                    </td>
                    <td className="text-[12px] text-[#6B7280]">{when(c.metrics?.lastOrderAt)}</td>
                    <td>
                      <span className={statusBadge(c.accountStatus)}>
                        <span className="v3-status-dot" />
                        {c.accountStatus || 'Active'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/admin/customers/${c.id}`} className="v3-btn v3-btn-icon v3-btn-ghost sm">
                        <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="v3-pagination">
              <span>Page {page} of {pages} · {total.toLocaleString()} customers</span>
              <div className="v3-pagination-controls">
                <button disabled={page <= 1} onClick={() => setFilter({ page: page - 1 })} className="v3-pagination-btn">←</button>
                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                  const p = Math.max(1, Math.min(pages - 4, page - 2)) + i;
                  return <button key={p} onClick={() => setFilter({ page: p })} className={`v3-pagination-btn ${p === page ? 'active' : ''}`}>{p}</button>;
                })}
                <button disabled={page >= pages} onClick={() => setFilter({ page: page + 1 })} className="v3-pagination-btn">→</button>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
