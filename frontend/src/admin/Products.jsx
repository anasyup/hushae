import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Archive, Copy, Eye, FileUp, LayoutGrid, List, Minus, Pencil, Plus, Save, Trash2, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import Img from '../components/Img';
import CsvImport from './CsvImport';
import {
  btnGhost, btnSolid, btnIcon, ctl, ctlInline,
  EditorialEmpty, EditorialError, EditorialPagination, TableSkeleton, MonoStatus,
} from './orders/orderUi';

/* ===========================================================================
 * Products — Phase 05 editorial catalog (presentation only).
 * All existing list/filter/bulk/csv/duplicate/publish actions preserved.
 * ========================================================================== */

export default function Products() {
  const { auth, toast } = useApp();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [cats, setCats] = useState([]);
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [f, setF] = useState({
    // Deep links from the Overview hub: ?q=<name> (name search, client-side)
    // and ?stock=low|out (matches the backend alert links).
    q: searchParams.get('q') || '',
    category: '', gender: '', tier: '',
    stock: searchParams.get('stock') === 'out' ? 'out' : (searchParams.get('stock') === 'low' ? 'low' : ''),
    status: searchParams.get('active') === '0' ? 'disabled' : (searchParams.get('status') || ''),
  });

  const load = () => {
    const sp = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (!v) return;
      if (k === 'status' && v === 'disabled') sp.set('active', '0');
      else if (k !== 'q') sp.set(k, v);
    });
    api(`/products/admin/list?${sp}`, { token: auth.token })
      .then((d) => { setList(d.products); setSelected(new Set()); setErr(''); })
      .catch(() => { setList([]); setErr('Something prevented the catalog from loading.'); });
  };
  useEffect(load, [f.category, f.gender, f.tier, f.stock, f.status]); // eslint-disable-line
  useEffect(() => {
    const s = searchParams.get('active') === '0' ? 'disabled' : (searchParams.get('status') || '');
    setF((x) => (x.status === s ? x : { ...x, status: s }));
  }, [searchParams]);

  /* Deep link from the sidebar "Import / Export" destination (PRODUCTS-AREA-SPEC):
     /admin/products/import → /admin/products?import=1 → CSV modal opens once,
     the flag is stripped so a refresh never re-opens it. */
  useEffect(() => {
    if (searchParams.get('import') !== '1') return;
    setCsvOpen(true);
    const n = new URLSearchParams(searchParams);
    n.delete('import');
    setSearchParams(n, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => { api('/categories?all=1').then((d) => setCats(d.categories)).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    if (!Array.isArray(list)) return [];
    if (!f.q.trim()) return list;
    const q = f.q.trim().toLowerCase();
    return list.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.categorySlug?.toLowerCase().includes(q)
    );
  }, [list, f.q]);

  const PER_PAGE = 50;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [f.q, f.gender, f.category, f.tier, f.stock, f.status, view]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  const summary = useMemo(() => {
    if (!Array.isArray(list)) return { total: 0, live: 0, draft: 0, archived: 0, oos: 0, low: 0 };
    let live = 0, draft = 0, archived = 0, oos = 0, low = 0;
    for (const p of list) {
      if (p.status === 'draft') draft++;
      else if (!p.isActive) archived++;
      else live++;
      if (p.stock === 0) oos++;
      else if (p.stock <= 5) low++;
    }
    return { total: list.length, live, draft, archived, oos, low };
  }, [list]);

  const enable = async (p) => {
    try { await api(`/products/${p._id}`, { method: 'PUT', token: auth.token, body: { isActive: true } }); toast(`"${p.name}" is now live`); load(); }
    catch (ex) { toast(ex.message); }
  };
  const publish = async (p) => {
    try {
      await api(`/products/${p._id}`, { method: 'PUT', token: auth.token, body: { status: 'active', isActive: true } });
      toast(`"${p.name}" published`);
      load();
    } catch (ex) { toast(ex.message); }
  };
  const disable = async (p) => {
    try { await api(`/products/${p._id}`, { method: 'DELETE', token: auth.token }); toast(`"${p.name}" archived`); load(); }
    catch (ex) { toast(ex.message); }
  };
  const remove = async (p) => {
    if (!window.confirm(`Permanently delete "${p.name}"?\n\nThis cannot be undone.`)) return;
    try { await api(`/products/${p._id}/permanent`, { method: 'DELETE', token: auth.token }); toast('Product deleted'); load(); }
    catch (ex) { toast(ex.message); }
  };
  const duplicate = async (p) => {
    try {
      const d = await api(`/products/${p._id}/duplicate`, { method: 'POST', token: auth.token });
      toast(`"${d.product.name}" created as draft`);
      load();
    } catch (ex) { toast(ex.message); }
  };

  const toggleSel = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleSelAll = () => {
    const pageIds = paged.map((p) => p._id);
    setSelected((s) => {
      const allOnPage = pageIds.length > 0 && pageIds.every((id) => s.has(id));
      const n = new Set(s);
      if (allOnPage) pageIds.forEach((id) => n.delete(id));
      else pageIds.forEach((id) => n.add(id));
      return n;
    });
  };

  const clearFilters = () => setF({ q: '', category: '', gender: '', tier: '', stock: '', status: '' });
  const hasFilters = !!(f.q || f.category || f.gender || f.tier || f.stock || f.status);
  const extraFilterCount = [f.gender, f.tier, f.stock].filter(Boolean).length;

  /* Saved views — the metrics strip IS the view switcher. Each cell is a
     clickable view with a live count; status views and stock views are
     mutually exclusive so one click always lands on one clear list. */
  const metrics = [
    { label: 'All', value: summary.total, onClick: () => setF({ ...f, status: '', stock: '' }), active: !f.status && !f.stock },
    { label: 'Active', value: summary.live, onClick: () => setF({ ...f, status: 'active', stock: '' }), active: f.status === 'active' },
    { label: 'Draft', value: summary.draft, onClick: () => setF({ ...f, status: 'draft', stock: '' }), active: f.status === 'draft' },
    { label: 'Archived', value: summary.archived, onClick: () => setF({ ...f, status: 'disabled', stock: '' }), active: f.status === 'disabled' },
    { label: 'Low stock', value: summary.low, onClick: () => setF({ ...f, stock: 'low', status: '' }), active: f.stock === 'low' },
    { label: 'Out of stock', value: summary.oos, onClick: () => setF({ ...f, stock: 'out', status: '' }), active: f.stock === 'out' },
  ];

  /* One-step status changes for the whole selection (bulk PATCH accepts
     isActive/status booleans). Used by the sticky selection bar. */
  const bulkQuick = async (patch, verb) => {
    try {
      const res = await api('/products/bulk', {
        method: 'PATCH', token: auth.token,
        body: { ids: [...selected], patch },
      });
      toast(`${verb} ${res.updated} product${res.updated === 1 ? '' : 's'}`);
      setSelected(new Set());
      load();
    } catch (ex) { toast(ex.message || 'Bulk update failed'); }
  };

  /* Inline stock adjust — optimistic row update, server delta, rollback via
     reload on failure. The backend only rings the low-stock bell when the
     line is crossed downward, so tapping − on an already-low row stays quiet. */
  const adjustStock = async (p, delta) => {
    const next = Math.max(0, (p.stock || 0) + delta);
    setList((l) => (Array.isArray(l) ? l.map((x) => (x._id === p._id ? { ...x, stock: next } : x)) : l));
    try {
      await api(`/products/${p._id}/stock`, { method: 'PATCH', token: auth.token, body: { delta } });
    } catch (ex) { toast(ex.message || 'Stock update failed'); load(); }
  };

  return (
    <AdminLayout title="Products">
      <PageHeader
        title="Products"
        description="Catalog management."
        actions={(
          <>
            <button type="button" onClick={() => setCsvOpen(true)} className={btnGhost}>
              <FileUp size={12} /> Import / Export
            </button>
            <Link to="/admin/products/new" className={btnSolid}>
              <Plus size={12} /> Add product
            </Link>
          </>
        )}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Catalog overview</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-white/10 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map((m) => (
            <button key={m.label} type="button" onClick={m.onClick} aria-pressed={m.active} className="px-5 py-6 text-left adm-row-hover">
              <p className={`adm-label ${m.active ? 'text-white/70' : ''}`}>{m.label}</p>
              <p className="adm-metric mt-3 text-[32px] leading-none text-white">
                {list === null ? '—' : m.value.toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">02 — Product workspace</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <input
              value={f.q}
              onChange={(e) => setF({ ...f, q: e.target.value })}
              placeholder="Search products…"
              aria-label="Search products"
              className={ctl}
            />
          </div>
          <select
            value={f.status}
            onChange={(e) => setF({ ...f, status: e.target.value })}
            aria-label="Status"
            className={`${ctlInline} max-w-[140px]`}
          >
            <option value="">Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="disabled">Archived</option>
          </select>
          <select
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
            aria-label="Category"
            className={`${ctlInline} max-w-[180px]`}
          >
            <option value="">Category</option>
            {cats.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name} ({c.gender?.[0]?.toUpperCase()})</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={moreOpen || extraFilterCount ? 'inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-white px-3 text-[10px] font-medium uppercase tracking-[0.08em] text-black' : btnGhost}
          >
            More{extraFilterCount > 0 ? ` ${extraFilterCount}` : ''}
          </button>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => setView('list')} aria-pressed={view === 'list'} title="List view"
              className={view === 'list' ? `${btnIcon} border-white text-white` : btnIcon}>
              <List size={13} />
            </button>
            <button type="button" onClick={() => setView('grid')} aria-pressed={view === 'grid'} title="Grid view"
              className={view === 'grid' ? `${btnIcon} border-white text-white` : btnIcon}>
              <LayoutGrid size={13} />
            </button>
          </div>
        </div>

        {moreOpen && (
          <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
            <select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} aria-label="Gender" className={ctl}>
              <option value="">All genders</option>
              <option value="women">Women</option>
              <option value="men">Men</option>
            </select>
            <select value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })} aria-label="Tier" className={ctl}>
              <option value="">All tiers</option>
              <option value="Economy">Economy</option>
              <option value="Standard">Standard</option>
              <option value="Premium">Premium</option>
            </select>
            <select value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} aria-label="Stock" className={ctl}>
              <option value="">Any stock</option>
              <option value="low">Low (≤5)</option>
              <option value="out">Out of stock</option>
            </select>
          </div>
        )}

        {hasFilters && (
          <p className="mt-3 text-[11px] text-white/35">
            Filters active · <button type="button" onClick={clearFilters} className="text-white/70 underline underline-offset-2 hover:text-white">Clear</button>
          </p>
        )}
      </section>

      <section className="mb-6">
        <p className="adm-index">03 — Products</p>

        {selected.size > 0 && (
          <div className="sticky top-14 z-30 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-white/15 bg-[#050505] py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white">{selected.size} selected</span>
            <button type="button" onClick={() => setBulkOpen(true)} className={btnSolid}>
              <Pencil size={11} /> Edit
            </button>
            <button type="button" onClick={() => bulkQuick({ isActive: true }, 'Activated')} className={btnGhost}>
              <Eye size={11} /> Activate
            </button>
            <button type="button" onClick={() => bulkQuick({ isActive: false }, 'Archived')} className={btnGhost}>
              <Archive size={11} /> Archive
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-[11px] uppercase tracking-[0.12em] text-white/40 hover:text-white">Clear</button>
          </div>
        )}

        {err && (
          <EditorialError title="Unable to load products" description={err} onRetry={() => { setList(null); setErr(''); load(); }} />
        )}

        {list === null && !err && <TableSkeleton rows={7} />}

        {!err && list !== null && filtered.length === 0 && (
          <EditorialEmpty
            title="No products"
            description={hasFilters ? 'No products match these filters.' : 'Your catalog is empty.'}
            action={hasFilters
              ? <button type="button" onClick={clearFilters} className={btnGhost}>Clear filters</button>
              : <Link to="/admin/products/new" className={btnSolid}>Add product</Link>}
          />
        )}

        {!err && filtered.length > 0 && view === 'list' && (
          <ProductTable
            products={paged}
            selected={selected}
            onToggleSel={toggleSel}
            onToggleAll={toggleSelAll}
            onEnable={enable}
            onDisable={disable}
            onPublish={publish}
            onRemove={remove}
            onDuplicate={duplicate}
            onAdjustStock={adjustStock}
          />
        )}

        {!err && filtered.length > 0 && view === 'grid' && (
          <ProductGrid
            products={paged}
            onEnable={enable}
            onDisable={disable}
            onPublish={publish}
            onRemove={remove}
            onDuplicate={duplicate}
            onAdjustStock={adjustStock}
          />
        )}

        {filtered.length > 0 && (
          <EditorialPagination page={page} pages={pageCount} onPage={setPage} />
        )}
      </section>

      {csvOpen && <CsvImport onClose={() => setCsvOpen(false)} onDone={load} />}
      {bulkOpen && (
        <BulkEditModal
          count={selected.size}
          onClose={() => setBulkOpen(false)}
          onApply={async (patch) => {
            try {
              const res = await api('/products/bulk', {
                method: 'PATCH', token: auth.token,
                body: { ids: [...selected], patch },
              });
              toast(`Updated ${res.updated} product${res.updated === 1 ? '' : 's'}`);
              setBulkOpen(false);
              setSelected(new Set());
              load();
            } catch (ex) { toast(ex.message || 'Bulk update failed'); }
          }}
        />
      )}
    </AdminLayout>
  );
}

function productStatus(p) {
  if (p.status === 'draft') return { label: 'DRAFT', dim: true };
  if (!p.isActive) return { label: 'ARCHIVED', dim: true };
  return { label: 'ACTIVE', dim: false };
}

/* Stock cell with a one-tap stepper — inline adjust, no page leave.
   Optimistic update + server delta live in Products.adjustStock. */
function InventoryCell({ n, onAdjust }) {
  const stepper = onAdjust ? (
    <div className="mt-1 flex items-center gap-1">
      <button
        type="button"
        onClick={() => onAdjust(-1)}
        disabled={n <= 0}
        aria-label="Decrease stock by one"
        className="grid h-5 w-5 place-items-center border border-white/15 text-white/45 transition-colors hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Minus size={10} />
      </button>
      <button
        type="button"
        onClick={() => onAdjust(1)}
        aria-label="Increase stock by one"
        className="grid h-5 w-5 place-items-center border border-white/15 text-white/45 transition-colors hover:border-white/40 hover:text-white"
      >
        <Plus size={10} />
      </button>
    </div>
  ) : null;

  if (n === 0) {
    return (
      <div>
        <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/40">Out</p>
        <p className="mt-0.5 text-[12px] text-white/35">0 remaining</p>
        {stepper}
      </div>
    );
  }
  if (n <= 5) {
    return (
      <div>
        <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/55">Low</p>
        <p className="mt-0.5 text-[12px] text-white/70">{n} remaining</p>
        {stepper}
      </div>
    );
  }
  return (
    <div>
      <p className="text-[12px] tabular-nums text-white/80">{n} in stock</p>
      {stepper}
    </div>
  );
}

function RowActions({ p, onEnable, onDisable, onPublish, onRemove, onDuplicate }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Link to={`/admin/products/${p._id}`} className="grid h-7 w-7 place-items-center text-white/35 hover:text-white" aria-label="Edit">
        <Pencil size={13} />
      </Link>
      {p.status === 'draft' && (
        <button type="button" onClick={() => onPublish(p)} className="px-2 text-[9px] font-medium uppercase tracking-[0.14em] text-white/70 hover:text-white">
          Publish
        </button>
      )}
      <button type="button" onClick={() => onDuplicate(p)} className="grid h-7 w-7 place-items-center text-white/35 hover:text-white" aria-label="Duplicate" title="Duplicate product">
        <Copy size={13} />
      </button>
      {p.isActive ? (
        <button type="button" onClick={() => onDisable(p)} className="grid h-7 w-7 place-items-center text-white/35 hover:text-white" aria-label="Archive" title="Archive">
          <Archive size={13} />
        </button>
      ) : (
        <button type="button" onClick={() => onEnable(p)} className="grid h-7 w-7 place-items-center text-white/35 hover:text-white" aria-label="Restore" title="Restore">
          <Eye size={13} />
        </button>
      )}
      <button type="button" onClick={() => onRemove(p)} className="grid h-7 w-7 place-items-center text-white/35 hover:text-white" aria-label="Delete" title="Delete permanently">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function ProductTable({ products, selected, onToggleSel, onToggleAll, onEnable, onDisable, onPublish, onRemove, onDuplicate, onAdjustStock }) {
  const allSelected = products.length > 0 && products.every((p) => selected.has(p._id));
  return (
    <div className="min-w-0 overflow-x-hidden">
      <div className="hidden border-b border-white/10 px-1 py-2.5 lg:grid lg:grid-cols-[32px_48px_minmax(0,1.4fr)_0.7fr_0.75fr_0.75fr_0.7fr_auto] lg:items-center lg:gap-3 xl:grid-cols-[32px_48px_minmax(0,1.35fr)_0.7fr_0.7fr_0.7fr_0.85fr_0.7fr_0.85fr_auto]">
        <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all on this page"
          className="h-3.5 w-3.5 cursor-pointer rounded-none border-white/30 bg-transparent accent-white" />
        <span />
        <p className="adm-label">Product</p>
        <p className="adm-label">Sku</p>
        <p className="adm-label">Price</p>
        <p className="adm-label">Inventory</p>
        <p className="adm-label hidden xl:block">Category</p>
        <p className="adm-label">Status</p>
        <p className="adm-label hidden xl:block">Updated</p>
        <p className="adm-label" />
      </div>

      {products.map((p) => {
        const st = productStatus(p);
        return (
          <div key={p._id} className={`border-b border-white/10 ${selected.has(p._id) ? 'bg-white/[0.03]' : ''} adm-row-hover`}>
            <div className="hidden lg:grid lg:grid-cols-[32px_48px_minmax(0,1.4fr)_0.7fr_0.75fr_0.75fr_0.7fr_auto] lg:items-center lg:gap-3 lg:px-1 lg:py-3 xl:grid-cols-[32px_48px_minmax(0,1.35fr)_0.7fr_0.7fr_0.7fr_0.85fr_0.7fr_0.85fr_auto]">
              <input type="checkbox" checked={selected.has(p._id)} onChange={() => onToggleSel(p._id)}
                aria-label={`Select ${p.name}`}
                className="h-3.5 w-3.5 cursor-pointer rounded-none border-white/30 bg-transparent accent-white" />
              <Link to={`/admin/products/${p._id}`} className="block">
                <Img src={p.images?.[0]?.url} alt="" className="h-12 w-12 border border-white/10 object-cover" />
              </Link>
              <div className="min-w-0">
                <Link to={`/admin/products/${p._id}`} className="line-clamp-2 text-[13px] font-medium text-white hover:text-white/70">{p.name}</Link>
                <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.08em] text-white/30">
                  {p.gender}{p.tier ? ` · ${p.tier}` : ''}
                  {p.isFeatured ? ' · Featured' : ''}
                  {p.isBestSeller ? ' · Best' : ''}
                  {p.onSale ? ' · Sale' : ''}
                </p>
              </div>
              <p className="truncate font-mono text-[11px] text-white/40">{p.sku || '—'}</p>
              <div>
                <p className="adm-metric text-[13px] text-white">{pkr(p.price)}</p>
                {p.onSale === true && p.compareAtPrice ? (
                  <p className="text-[11px] text-white/30 line-through">{pkr(p.compareAtPrice)}</p>
                ) : null}
              </div>
              <InventoryCell n={p.stock} onAdjust={(d) => onAdjustStock(p, d)} />
              <p className="hidden truncate text-[12px] text-white/45 xl:block">{p.categorySlug || '—'}</p>
              <MonoStatus label={st.label} dim={st.dim} />
              <p className="hidden text-[11px] text-white/30 xl:block">{p.updatedAt ? fmtDate(p.updatedAt) : '—'}</p>
              <RowActions p={p} onEnable={onEnable} onDisable={onDisable} onPublish={onPublish} onRemove={onRemove} onDuplicate={onDuplicate} />
            </div>

            <div className="flex items-start gap-3 px-1 py-4 lg:hidden">
              <input type="checkbox" checked={selected.has(p._id)} onChange={() => onToggleSel(p._id)}
                aria-label={`Select ${p.name}`}
                className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer rounded-none border-white/30 bg-transparent accent-white" />
              <Link to={`/admin/products/${p._id}`} className="shrink-0">
                <Img src={p.images?.[0]?.url} alt="" className="h-16 w-16 border border-white/10 object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/admin/products/${p._id}`} className="line-clamp-2 text-[13px] font-medium text-white">{p.name}</Link>
                <p className="mt-0.5 font-mono text-[11px] text-white/35">{p.sku || '—'}</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                  <p className="adm-metric text-[14px] text-white">{pkr(p.price)}</p>
                  <InventoryCell n={p.stock} onAdjust={(d) => onAdjustStock(p, d)} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <MonoStatus label={st.label} dim={st.dim} />
                  {p.onSale && <span className="text-[9px] uppercase tracking-[0.16em] text-white/40">Sale</span>}
                </div>
                <div className="mt-2">
                  <RowActions p={p} onEnable={onEnable} onDisable={onDisable} onPublish={onPublish} onRemove={onRemove} onDuplicate={onDuplicate} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductGrid({ products, onEnable, onDisable, onPublish, onRemove, onDuplicate, onAdjustStock }) {
  return (
    <div className="grid gap-px border-y border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => {
        const st = productStatus(p);
        return (
          <div key={p._id} className="bg-[#09090B] p-4">
            <Link to={`/admin/products/${p._id}`} className="block">
              <div className="aspect-square overflow-hidden border border-white/10 bg-white/[0.03]">
                <Img src={p.images?.[0]?.url} alt="" className="h-full w-full object-cover" />
              </div>
            </Link>
            <div className="mt-3 flex items-start justify-between gap-2">
              <Link to={`/admin/products/${p._id}`} className="line-clamp-2 text-[13px] font-medium text-white">{p.name}</Link>
              <MonoStatus label={st.label} dim={st.dim} />
            </div>
            <p className="mt-1 font-mono text-[11px] text-white/35">{p.sku || '—'}</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="adm-metric text-[14px] text-white">{pkr(p.price)}</p>
              <InventoryCell n={p.stock} onAdjust={(d) => onAdjustStock(p, d)} />
            </div>
            <div className="mt-2">
              <RowActions p={p} onEnable={onEnable} onDisable={onDisable} onPublish={onPublish} onRemove={onRemove} onDuplicate={onDuplicate} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BulkEditModal({ count, onClose, onApply }) {
  const [action, setAction] = useState('setStock');
  const [numValue, setNumValue] = useState('');
  const [tier, setTier] = useState('Standard');
  const [bool, setBool] = useState(true);
  const [status, setStatus] = useState('active');
  const [busy, setBusy] = useState(false);

  const actions = [
    { key: 'setStock', label: 'Set stock', hint: 'Overwrites current stock with the value below.' },
    { key: 'stockDelta', label: 'Adjust stock by', hint: 'Adds or subtracts. e.g. +50 to restock, −10 to reduce.' },
    { key: 'setPrice', label: 'Set price (PKR)', hint: 'Overwrites current price.' },
    { key: 'setCost', label: 'Set cost/wholesale', hint: 'Overwrites current cost price (used for profit calc).' },
    { key: 'priceChangePct', label: 'Adjust prices by %', hint: 'Applies a % change to each product.' },
    { key: 'setTier', label: 'Change tier', hint: 'Overwrites tier (Economy / Standard / Premium).' },
    { key: 'setStatus', label: 'Change status', hint: 'Move to draft (hidden) or active (live).' },
    { key: 'toggleFeatured', label: 'Featured on/off', hint: 'Mark or unmark as Featured across the selection.' },
    { key: 'toggleBest', label: 'Best-seller on/off', hint: 'Mark or unmark as Best-seller.' },
    { key: 'toggleSale', label: 'Sale on/off', hint: 'Switch these products on or off the Sale page.' },
  ];

  const active = actions.find((a) => a.key === action);
  const needsNum = ['setStock', 'stockDelta', 'setPrice', 'setCost', 'priceChangePct'].includes(action);

  const apply = async () => {
    const patch = {};
    if (action === 'setStock') patch.stock = numValue;
    if (action === 'stockDelta') patch.stockDelta = numValue;
    if (action === 'setPrice') patch.price = numValue;
    if (action === 'setCost') patch.costPrice = numValue;
    if (action === 'priceChangePct') patch.priceChangePct = numValue;
    if (action === 'setTier') patch.tier = tier;
    if (action === 'setStatus') patch.status = status;
    if (action === 'toggleFeatured') patch.isFeatured = bool;
    if (action === 'toggleBest') patch.isBestSeller = bool;
    if (action === 'toggleSale') patch.onSale = bool;
    if (needsNum && (numValue === '' || numValue === null)) return;
    setBusy(true);
    try { await onApply(patch); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto border border-white/15 bg-[#0D0D0D]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="adm-label">Bulk edit</p>
            <p className="mt-1 text-[16px] font-medium text-white">Update {count} product{count === 1 ? '' : 's'}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="text-white/35 hover:text-white" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="px-6 py-5">
          <p className="adm-label mb-3">What do you want to do?</p>
          <div className="grid grid-cols-2 gap-1.5">
            {actions.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setAction(a.key)}
                className={`px-3 py-2 text-left text-[12px] transition ${
                  action === a.key ? 'bg-white text-black' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="mb-3 text-[12px] leading-relaxed text-white/40">{active?.hint}</p>
            {needsNum && (
              <input
                type="number"
                value={numValue}
                onChange={(e) => setNumValue(e.target.value)}
                className={`${ctl} !h-10 !text-[15px]`}
                placeholder={action === 'setStock' ? '50' : action === 'stockDelta' ? '+50 or -10' : action === 'priceChangePct' ? '10' : '1800'}
                autoFocus
              />
            )}
            {action === 'setTier' && (
              <div className="grid grid-cols-3 gap-1.5">
                {['Economy', 'Standard', 'Premium'].map((t) => (
                  <button key={t} type="button" onClick={() => setTier(t)}
                    className={`h-8 text-[11px] uppercase tracking-[0.12em] ${tier === t ? 'bg-white text-black' : 'border border-white/20 text-white/60'}`}>{t}</button>
                ))}
              </div>
            )}
            {action === 'setStatus' && (
              <div className="grid grid-cols-2 gap-1.5">
                {[{ v: 'active', label: 'Active (live)' }, { v: 'draft', label: 'Draft (hidden)' }].map((o) => (
                  <button key={o.v} type="button" onClick={() => setStatus(o.v)}
                    className={`h-8 text-[11px] uppercase tracking-[0.12em] ${status === o.v ? 'bg-white text-black' : 'border border-white/20 text-white/60'}`}>{o.label}</button>
                ))}
              </div>
            )}
            {(action === 'toggleFeatured' || action === 'toggleBest' || action === 'toggleSale') && (
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => setBool(true)} className={`h-8 text-[11px] uppercase tracking-[0.12em] ${bool ? 'bg-white text-black' : 'border border-white/20 text-white/60'}`}>Turn on</button>
                <button type="button" onClick={() => setBool(false)} className={`h-8 text-[11px] uppercase tracking-[0.12em] ${!bool ? 'bg-white text-black' : 'border border-white/20 text-white/60'}`}>Turn off</button>
              </div>
            )}
          </div>
          <p className="mt-5 text-[12px] text-white/35">
            This applies to {count} product{count === 1 ? '' : 's'} and cannot be undone.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-6 py-4">
          <button type="button" onClick={onClose} disabled={busy} className={btnGhost}>Cancel</button>
          <button
            type="button"
            onClick={apply}
            disabled={busy || (needsNum && (numValue === '' || numValue === null))}
            className={btnSolid}
          >
            <Save size={12} /> {busy ? 'Applying…' : `Apply to ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}
