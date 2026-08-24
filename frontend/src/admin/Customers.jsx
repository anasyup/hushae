import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Filter, Loader2, Plus, Tag, Users, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import {
  btnGhost, btnSolid, ctl, ctlInline,
  EditorialEmpty, EditorialError, EditorialPagination, MonoStatus, TableSkeleton,
} from './orders/orderUi';

const SEGMENTS = [
  ['all', 'All'], ['new', 'New'], ['repeat', 'Repeat'], ['vip', 'VIP'], ['high_value', 'High Value'], ['inactive', 'Inactive'],
];
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const dateInput = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
const when = (value) => (value ? fmtDate(value) : '—');

function statusDim(status) {
  return ['UNVERIFIED', 'SUSPENDED', 'DELETED'].includes(String(status || '').toUpperCase());
}

function QueryFilter({ label, value, onChange, children }) {
  return (
    <label className="block min-w-[132px]">
      <span className="adm-label mb-1 block">{label}</span>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)} className={ctlInline}>
        {children}
      </select>
    </label>
  );
}

export default function Customers() {
  const { auth, toast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [directory, setDirectory] = useState(null);
  const [facets, setFacets] = useState({ countries: [], tags: [] });
  const [segmentCounts, setSegmentCounts] = useState(null);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selected, setSelected] = useState([]);
  const [bulkTag, setBulkTag] = useState('');
  const [bulkGroup, setBulkGroup] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const queryKey = searchParams.toString();

  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [queryKey]);
  const currentSegment = params.segment || 'all';
  const page = Number(params.page || 1);

  const setFilter = useCallback((patch = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === 'all') next.delete(key);
      else next.set(key, String(value));
    });
    if (!Object.prototype.hasOwnProperty.call(patch, 'page')) next.delete('page');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const load = useCallback(async () => {
    setError('');
    try {
      const [data, facetData, groupData, audienceData] = await Promise.all([
        api(`/customers?${queryKey}`, { token: auth?.token, noCache: true }),
        api('/customers/facets', { token: auth?.token, noCache: true }).catch(() => ({ countries: [], tags: [] })),
        api('/customer-groups', { token: auth?.token, noCache: true }).catch(() => ({ groups: [] })),
        api('/customers/segments', { token: auth?.token, noCache: true }).catch(() => ({ segments: null })),
      ]);
      setDirectory(data);
      setFacets(facetData);
      setGroups(groupData.groups || []);
      setSegmentCounts(audienceData.segments || null);
    } catch (err) {
      setDirectory({ customers: [], total: 0, page: 1, pages: 1 });
      setError(err?.message || 'Customer directory could not load.');
    }
  }, [auth?.token, queryKey]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelected([]); }, [queryKey]);
  useEffect(() => { setSearch(searchParams.get('search') || ''); }, [queryKey]);
  useEffect(() => {
    const timer = setTimeout(() => {
      const existing = searchParams.get('search') || '';
      if (search.trim() !== existing) setFilter({ search: search.trim() });
    }, 280);
    return () => clearTimeout(timer);
  }, [search, searchParams, setFilter]);

  const customers = directory?.customers || [];
  const allOnPage = customers.length > 0 && customers.every((customer) => selected.includes(String(customer.id)));
  const toggle = (id) => setSelected((current) => current.includes(String(id))
    ? current.filter((value) => value !== String(id))
    : [...current, String(id)]);
  const toggleAll = () => setSelected((current) => allOnPage
    ? current.filter((id) => !customers.some((customer) => String(customer.id) === id))
    : [...new Set([...current, ...customers.map((customer) => String(customer.id))])]);

  const bulk = async (action) => {
    if (!selected.length) return;
    const body = { action, ids: selected };
    if (action === 'add_tag' || action === 'remove_tag') {
      if (!bulkTag.trim()) { toast('Pehle tag likhein'); return; }
      body.tag = bulkTag;
    }
    if (action === 'assign_group') {
      if (!bulkGroup) { toast('Pehle group select karein'); return; }
      body.groupId = bulkGroup;
    }
    const label = action === 'add_tag' ? `“${bulkTag}” tag add` : action === 'remove_tag' ? `“${bulkTag}” tag remove` : 'selected group assign';
    if (!window.confirm(`${selected.length} customer(s) par ${label} karna hai?`)) return;
    setBulkBusy(true);
    try {
      const result = await api('/customers/bulk', { method: 'POST', token: auth?.token, body });
      toast(`${result.modified || 0} customers update ho gaye`);
      setSelected([]); setBulkTag(''); setBulkGroup(''); load();
    } catch (err) { toast(err.message || 'Bulk update nahi ho saka'); }
    setBulkBusy(false);
  };

  const exportCustomers = async () => {
    setExportBusy(true);
    try {
      const exportParams = new URLSearchParams(searchParams);
      exportParams.delete('page'); exportParams.delete('limit');
      const response = await fetch(`${BASE}/api/customers/export?${exportParams.toString()}`, {
        headers: { Authorization: `Bearer ${auth?.token || ''}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'hushae-customers.csv'; link.click();
      URL.revokeObjectURL(url);
      toast('Customer export download ho raha hai');
    } catch (err) { toast(err.message || 'Export nahi ho saka'); }
    setExportBusy(false);
  };

  return (
    <AdminLayout title="Customers">
      <PageHeader
        eyebrow="Customer 360"
        title="Customers"
        description="Server-side customer directory, value metrics aur real relationship context."
        actions={(
          <>
            <Link to="/admin/customers/groups" className={btnGhost}><Users size={12} /> Groups</Link>
            <button type="button" onClick={exportCustomers} disabled={exportBusy} className={btnGhost}>
              {exportBusy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Export
            </button>
          </>
        )}
      />

      <section className="mb-8">
        <p className="adm-index">01 — Business segments</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] md:grid-cols-3 xl:grid-cols-6">
          {SEGMENTS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter({ segment: key })}
              className={`px-4 py-4 text-left transition-colors hover:bg-[#F7F7F7] ${currentSegment === key ? 'bg-[#F7F7F7]' : ''}`}>
              <p className="adm-label">{label}</p>
              <p className="adm-metric mt-2 text-[20px] text-black">{segmentCounts ? Number(segmentCounts[key] || 0).toLocaleString() : '—'}</p>
              <p className="mt-1 text-[10px] text-[#777777]">{key === 'vip' ? 'PKR 500k+' : key === 'repeat' ? '2+ qualifying orders' : 'Filter list'}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <p className="adm-index">02 — Directory filters</p>
        <div className="flex flex-wrap items-center gap-2 border-y border-[#EAEAEA] py-4">
          <input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email, phone, WhatsApp, customer ID ya order number…" className={`${ctl} min-w-[240px] flex-1`} />
          <select value={currentSegment} onChange={(event) => setFilter({ segment: event.target.value })} className={ctlInline} aria-label="Segment">
            {SEGMENTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <button type="button" onClick={() => setFilterOpen((open) => !open)} className={btnGhost} aria-expanded={filterOpen}>
            <Filter size={12} /> Filters
          </button>
          {(queryKey || search) && <button type="button" onClick={() => { setSearch(''); setSearchParams({}, { replace: true }); }} className={btnGhost}>Clear</button>}
        </div>

        {filterOpen && (
          <div className="grid gap-3 border-b border-[#EAEAEA] py-4 sm:grid-cols-2 xl:grid-cols-4">
            <QueryFilter label="Country" value={params.country} onChange={(value) => setFilter({ country: value })}>
              <option value="">All countries</option><option value="UNKNOWN">Unknown</option>
              {facets.countries.map((country) => <option key={country.value} value={country.value}>{country.value} ({country.count})</option>)}
            </QueryFilter>
            <QueryFilter label="Tag" value={params.tag} onChange={(value) => setFilter({ tag: value })}>
              <option value="">Any tag</option>{facets.tags.map((tag) => <option key={tag.value} value={tag.value}>{tag.value} ({tag.count})</option>)}
            </QueryFilter>
            <QueryFilter label="Account" value={params.account} onChange={(value) => setFilter({ account: value })}>
              <option value="">Any account</option><option value="active">Active</option><option value="unverified">Unverified</option><option value="suspended">Suspended</option><option value="deleted">Deleted</option>
            </QueryFilter>
            <QueryFilter label="Has orders" value={params.hasOrders} onChange={(value) => setFilter({ hasOrders: value })}>
              <option value="">Either</option><option value="yes">Has orders</option><option value="no">No orders</option>
            </QueryFilter>
            <QueryFilter label="Spend" value={params.minSpend || ''} onChange={(value) => setFilter({ minSpend: value })}>
              <option value="">Any spend</option><option value="10000">PKR 10,000+</option><option value="100000">PKR 100,000+</option><option value="500000">PKR 500,000+</option>
            </QueryFilter>
            <QueryFilter label="Orders" value={params.minOrders || ''} onChange={(value) => setFilter({ minOrders: value })}>
              <option value="">Any count</option><option value="1">1+</option><option value="2">2+</option><option value="5">5+</option>
            </QueryFilter>
            <QueryFilter label="Last order" value={params.lastOrderDays || ''} onChange={(value) => setFilter({ lastOrderDays: value })}>
              <option value="">Any time</option><option value="30">Within 30 days</option><option value="90">Within 90 days</option><option value="180">Within 180 days</option>
            </QueryFilter>
            <QueryFilter label="Joined" value={params.joinedFrom ? String(params.joinedFrom) : ''} onChange={(value) => setFilter({ joinedFrom: value })}>
              <option value="">Any time</option><option value={dateInput(30)}>Last 30 days</option><option value={dateInput(90)}>Last 90 days</option><option value={dateInput(365)}>Last year</option>
            </QueryFilter>
            <QueryFilter label="Wishlist" value={params.hasWishlist} onChange={(value) => setFilter({ hasWishlist: value })}>
              <option value="">Either</option><option value="yes">Has wishlist</option><option value="no">No wishlist</option>
            </QueryFilter>
            <QueryFilter label="Abandoned cart" value={params.hasAbandonedCart} onChange={(value) => setFilter({ hasAbandonedCart: value })}>
              <option value="">Either</option><option value="yes">Has cart</option><option value="no">No cart</option>
            </QueryFilter>
            <QueryFilter label="Loyalty" value={params.loyalty} onChange={(value) => setFilter({ loyalty: value })}>
              <option value="">Either</option><option value="yes">In loyalty</option><option value="no">No account</option>
            </QueryFilter>
            <QueryFilter label="Sort" value={params.sort || 'joined'} onChange={(value) => setFilter({ sort: value })}>
              <option value="joined">Newest joined</option><option value="revenue">Highest revenue</option><option value="orders">Most orders</option><option value="aov">Highest AOV</option><option value="lastOrder">Latest order</option><option value="name">Name A–Z</option>
            </QueryFilter>
          </div>
        )}
      </section>

      {selected.length > 0 && (
        <section className="sticky top-[56px] z-10 mb-5 border border-black bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 text-[12px] font-medium text-black">{selected.length} selected</p>
            <input value={bulkTag} onChange={(event) => setBulkTag(event.target.value)} placeholder="Tag e.g. Bridal" className={`${ctl} !w-36`} />
            <button type="button" disabled={bulkBusy} onClick={() => bulk('add_tag')} className={btnGhost}><Plus size={11} /> Add tag</button>
            <button type="button" disabled={bulkBusy} onClick={() => bulk('remove_tag')} className={btnGhost}><X size={11} /> Remove tag</button>
            <select value={bulkGroup} onChange={(event) => setBulkGroup(event.target.value)} className={ctlInline}>
              <option value="">Assign group…</option>{groups.map((group) => <option key={group.id || group._id} value={group.id || group._id}>{group.name}</option>)}
            </select>
            <button type="button" disabled={bulkBusy} onClick={() => bulk('assign_group')} className={btnGhost}>{bulkBusy ? <Loader2 size={11} className="animate-spin" /> : <Users size={11} />} Assign group</button>
            <button type="button" onClick={() => setSelected([])} className="ml-auto text-[10px] font-medium uppercase tracking-[0.14em] text-[#777777] hover:text-black">Clear selection</button>
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="adm-index">03 — Customers</p><p className="text-[12px] text-[#777777]">{directory ? `${directory.total.toLocaleString()} matching customer${directory.total === 1 ? '' : 's'}` : 'Loading…'}</p></div>
          {customers.length > 0 && <label className="inline-flex items-center gap-2 text-[11px] text-[#777777]"><input type="checkbox" checked={allOnPage} onChange={toggleAll} /> Select page</label>}
        </div>

        {error && <EditorialError title="Customer directory unavailable" description={error} onRetry={load} />}
        {!directory && !error && <TableSkeleton rows={8} />}
        {directory && !error && customers.length === 0 && <EditorialEmpty title="No matching customers" description="Search ya filter change karein — kisi customer record ko delete nahi kiya gaya." />}

        {directory && !error && customers.length > 0 && (
          <div className="border-y border-[#EAEAEA]">
            <div className="hidden grid-cols-[28px_minmax(180px,1.4fr)_minmax(160px,1.3fr)_78px_86px_86px_105px_100px_96px_92px] gap-3 border-b border-[#EAEAEA] px-2 py-3 xl:grid">
              {['', 'Customer', 'Email / phone', 'Country', 'Orders', 'Revenue', 'AOV', 'Segment', 'Last order', 'Status'].map((label, index) => <p key={`${label}-${index}`} className="adm-label">{label}</p>)}
            </div>
            {customers.map((customer) => {
              const isSelected = selected.includes(String(customer.id));
              return (
                <div key={customer.id} className={`border-b border-[#EAEAEA] last:border-0 ${isSelected ? 'bg-[#F7F7F7]' : ''}`}>
                  <div className="hidden items-center gap-3 px-2 py-3 xl:grid xl:grid-cols-[28px_minmax(180px,1.4fr)_minmax(160px,1.3fr)_78px_86px_86px_105px_100px_96px_92px]">
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(customer.id)} aria-label={`Select ${customer.name}`} />
                    <Link to={`/admin/customers/${customer.id}`} className="min-w-0 group">
                      <p className="truncate text-[13px] font-medium text-black group-hover:underline">{customer.name || '—'}</p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-[#777777]">{customer.id}</p>
                    </Link>
                    <Link to={`/admin/customers/${customer.id}`} className="min-w-0"><p className="truncate text-[12px] text-[#555555]">{customer.email || '—'}</p><p className="mt-0.5 truncate text-[11px] text-[#777777]">{customer.phone || customer.whatsApp || '—'}</p></Link>
                    <p className="text-[12px] text-[#555555]">{customer.country || '—'}</p>
                    <p className="text-[12px] tabular-nums text-black">{customer.metrics.orders}</p>
                    <p className="text-[12px] tabular-nums text-black">{pkr(customer.metrics.ltv)}</p>
                    <p className="text-[12px] tabular-nums text-[#555555]">{customer.metrics.orders ? pkr(customer.metrics.aov) : '—'}</p>
                    <div><MonoStatus label={customer.engagement.label} dim={customer.engagement.key === 'all' || customer.engagement.key === 'inactive'} /></div>
                    <p className="text-[11px] text-[#777777]">{when(customer.metrics.lastOrderAt)}</p>
                    <MonoStatus label={customer.accountStatus} dim={statusDim(customer.accountStatus)} />
                  </div>
                  <div className="flex gap-3 px-3 py-4 xl:hidden">
                    <input className="mt-1" type="checkbox" checked={isSelected} onChange={() => toggle(customer.id)} aria-label={`Select ${customer.name}`} />
                    <Link to={`/admin/customers/${customer.id}`} className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[13px] font-medium text-black">{customer.name || '—'}</p><p className="mt-0.5 truncate text-[11px] text-[#777777]">{customer.email || customer.phone || '—'}</p></div><MonoStatus label={customer.engagement.label} dim={customer.engagement.key === 'all'} /></div>
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#EAEAEA] pt-3"><div><p className="adm-label">Orders</p><p className="mt-1 text-[12px] text-black">{customer.metrics.orders}</p></div><div><p className="adm-label">Revenue</p><p className="mt-1 text-[12px] text-black">{pkr(customer.metrics.ltv)}</p></div><div><p className="adm-label">Status</p><p className="mt-1 text-[11px] text-[#555555]">{customer.accountStatus}</p></div></div>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {directory && directory.pages > 1 && <div className="mt-6"><EditorialPagination page={page} pages={directory.pages} onPage={(nextPage) => setFilter({ page: nextPage })} /></div>}
      </section>
    </AdminLayout>
  );
}
