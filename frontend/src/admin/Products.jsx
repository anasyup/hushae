import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle, Archive, ArrowUpDown, CheckCircle2, ChevronDown, Copy, DollarSign, Eye, EyeOff,
  Filter, Grid, LayoutGrid, List, Minus, Package, Pencil, Plus, Save, Search, Star, Trash2, TrendingUp, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

/* ============================================================================
 * Products admin — premium redesign.
 * Two view modes: List (dense table) and Grid (visual cards).
 * Header shows summary counters (Live / Draft / Archived / Out of stock).
 * Filter chips instead of raw selects.
 * ========================================================================== */

export default function Products() {
  const { auth, toast } = useApp();
  const [list, setList] = useState(null);
  const [cats, setCats] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'grid'
  const [selected, setSelected] = useState(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [f, setF] = useState({
    q: '', category: '', gender: '', tier: '', stock: '',
    status: searchParams.get('active') === '0' ? 'disabled' : (searchParams.get('status') || ''),
  });

  const load = () => {
    const sp = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (!v) return;
      if (k === 'status' && v === 'disabled') sp.set('active', '0');
      else sp.set(k, v);
    });
    api(`/products/admin/list?${sp}`, { token: auth.token })
      .then((d) => { setList(d.products); setSelected(new Set()); })
      .catch(() => setList([]));
  };
  useEffect(load, [f.category, f.gender, f.tier, f.stock, f.status]); // eslint-disable-line
  useEffect(() => {
    const s = searchParams.get('active') === '0' ? 'disabled' : (searchParams.get('status') || '');
    setF((x) => (x.status === s ? x : { ...x, status: s }));
  }, [searchParams]);

  useEffect(() => { api('/categories?all=1').then((d) => setCats(d.categories)).catch(() => {}); }, []);

  // Text search runs client-side so it's instant (results already loaded)
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

  // Summary counters from the loaded list
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
  const disable = async (p) => {
    try { await api(`/products/${p._id}`, { method: 'DELETE', token: auth.token }); toast(`"${p.name}" archived`); load(); }
    catch (ex) { toast(ex.message); }
  };
  const remove = async (p) => {
    if (!window.confirm(`Permanently delete "${p.name}"?\n\nThis cannot be undone.`)) return;
    try { await api(`/products/${p._id}/permanent`, { method: 'DELETE', token: auth.token }); toast('Product deleted'); load(); }
    catch (ex) { toast(ex.message); }
  };

  const toggleSel = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleSelAll = () => {
    setSelected((s) => s.size === filtered.length ? new Set() : new Set(filtered.map((p) => p._id)));
  };

  const clearFilters = () => setF({ q: '', category: '', gender: '', tier: '', stock: '', status: '' });
  const hasFilters = f.q || f.category || f.gender || f.tier || f.stock || f.status;

  const title = f.status === 'draft' ? 'Drafts'
    : f.status === 'disabled' ? 'Archived products'
    : f.status === 'active' ? 'Live products'
    : 'Inventory';

  return (
    <AdminLayout title={title}>
      {/* ============ TOP TOOLBAR ============ */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Global search */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={f.q}
              onChange={(e) => setF({ ...f, q: e.target.value })}
              placeholder="Search name, SKU, category…"
              className="input !w-72 !py-2.5 !pl-9 !text-[13px]"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
            <button
              onClick={() => setView('list')}
              className={`rounded-full px-2.5 py-1.5 text-neutral-500 transition ${view === 'list' ? 'bg-neutral-900 text-white' : 'hover:text-neutral-900'}`}
              title="List view"
            ><List size={13} /></button>
            <button
              onClick={() => setView('grid')}
              className={`rounded-full px-2.5 py-1.5 text-neutral-500 transition ${view === 'grid' ? 'bg-neutral-900 text-white' : 'hover:text-neutral-900'}`}
              title="Grid view"
            ><LayoutGrid size={13} /></button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={() => setBulkOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-neutral-800"
              title="Bulk edit selected products"
            >
              <Pencil size={11} /> Edit {selected.size} selected
            </button>
          )}
          <Link to="/admin/products/new" className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-neutral-800">
            <Plus size={13} /> Add product
          </Link>
        </div>
      </div>

      {/* ============ BULK EDIT MODAL ============ */}
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

      {/* ============ SUMMARY CARDS ============ */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Package}       label="Total"         value={summary.total}    tone="neutral" onClick={() => setF({ ...f, status: '' })} active={!f.status} />
        <SummaryCard icon={CheckCircle2}  label="Live"          value={summary.live}     tone="green"   onClick={() => setF({ ...f, status: 'active' })} active={f.status === 'active'} />
        <SummaryCard icon={Archive}       label="Archived"      value={summary.archived} tone="neutral" onClick={() => setF({ ...f, status: 'disabled' })} active={f.status === 'disabled'} />
        <SummaryCard icon={AlertCircle}   label="Out of stock"  value={summary.oos}      tone="red"     onClick={() => setF({ ...f, stock: 'out' })}     active={f.stock === 'out'} sub={`${summary.low} low`} />
      </div>

      {/* ============ FILTER CHIPS ============ */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
          <Filter size={12} /> Filter
        </span>

        <ChipSelect label="Gender" value={f.gender} onChange={(v) => setF({ ...f, gender: v })} options={[{ value: 'women', label: 'Women' }, { value: 'men', label: 'Men' }]} />
        <ChipSelect label="Category" value={f.category} onChange={(v) => setF({ ...f, category: v })} options={cats.map((c) => ({ value: c.slug, label: `${c.name} (${c.gender[0].toUpperCase()})` }))} />
        <ChipSelect label="Tier" value={f.tier} onChange={(v) => setF({ ...f, tier: v })} options={[{ value: 'Economy', label: 'Economy' }, { value: 'Standard', label: 'Standard' }, { value: 'Premium', label: 'Premium' }]} />
        <ChipSelect label="Stock" value={f.stock} onChange={(v) => setF({ ...f, stock: v })} options={[{ value: 'low', label: 'Low (≤5)' }, { value: 'out', label: 'Out of stock' }]} />

        {hasFilters && (
          <button onClick={clearFilters} className="ml-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-900">
            Clear all
          </button>
        )}
      </div>

      {/* ============ CONTENT ============ */}
      {list === null ? (
        <div className="skeleton h-64" />
      ) : filtered.length === 0 ? (
        <EmptyState onClear={clearFilters} hasFilters={hasFilters} />
      ) : view === 'grid' ? (
        <GridView products={filtered} onEnable={enable} onDisable={disable} onRemove={remove} />
      ) : (
        <ListView
          products={filtered}
          selected={selected}
          onToggleSel={toggleSel}
          onToggleAll={toggleSelAll}
          onEnable={enable}
          onDisable={disable}
          onRemove={remove}
        />
      )}

      {list !== null && (
        <p className="mt-4 text-center text-[11px] text-neutral-400">
          Showing <b className="text-neutral-700">{filtered.length}</b> of {list.length} products
        </p>
      )}
    </AdminLayout>
  );
}

/* ============================================================================
 * Sub-components
 * ========================================================================== */

function SummaryCard({ icon: Icon, label, value, tone, sub, onClick, active }) {
  const toneMap = {
    neutral: { text: 'text-neutral-700', bg: 'bg-neutral-100', ring: 'ring-neutral-200' },
    green:   { text: 'text-emerald-700', bg: 'bg-emerald-50',  ring: 'ring-emerald-200' },
    amber:   { text: 'text-amber-700',   bg: 'bg-amber-50',    ring: 'ring-amber-200' },
    red:     { text: 'text-red-700',     bg: 'bg-red-50',      ring: 'ring-red-200' },
  };
  const t = toneMap[tone] || toneMap.neutral;
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${active ? 'border-neutral-900 ring-2 ring-neutral-900/10' : 'border-neutral-200'}`}
    >
      <div className="flex items-center justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${t.bg} ${t.text}`}>
          <Icon size={15} />
        </span>
        {sub && <span className={`text-[10px] font-semibold ${t.text}`}>{sub}</span>}
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className={`mt-0.5 font-sans text-2xl font-semibold tabular-nums leading-none tracking-tight ${active ? 'text-neutral-900' : 'text-neutral-800'}`}>
        {value.toLocaleString()}
      </p>
    </button>
  );
}

function ChipSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

  // Close on outside click / Esc
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
          selected
            ? 'border-neutral-900 bg-neutral-900 text-white'
            : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
        }`}
      >
        {label}{selected && `: ${selected.label}`}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-64 min-w-40 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
          <button onClick={() => { onChange(''); setOpen(false); }} className={`block w-full px-3 py-2 text-left text-[12px] transition ${!value ? 'bg-neutral-100 font-semibold' : 'hover:bg-neutral-50'}`}>
            All
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`block w-full px-3 py-2 text-left text-[12px] transition ${value === o.value ? 'bg-neutral-100 font-semibold' : 'hover:bg-neutral-50'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StockPill({ n }) {
  if (n === 0) return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">● Out</span>;
  if (n <= 5)  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">● {n} left</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">● {n}</span>;
}

function StatusChip({ p }) {
  if (p.status === 'draft') return <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Draft</span>;
  if (!p.isActive) return <span className="inline-flex items-center rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700">Archived</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">● Live</span>;
}

function ListView({ products, selected, onToggleSel, onToggleAll, onEnable, onDisable, onRemove }) {
  const allSelected = products.length > 0 && selected.size === products.length;
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50/60">
            <th className="w-10 px-4 py-3 text-left">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="h-4 w-4 rounded accent-neutral-900" />
            </th>
            <th className="table-head">Product</th>
            <th className="table-head">SKU</th>
            <th className="table-head">Tier</th>
            <th className="table-head">Price</th>
            <th className="table-head">Stock</th>
            <th className="table-head">Status</th>
            <th className="table-head" />
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id} className="border-b border-neutral-100 transition hover:bg-neutral-50/70">
              <td className="px-4 py-3">
                <input type="checkbox" checked={selected.has(p._id)} onChange={() => onToggleSel(p._id)} className="h-4 w-4 rounded accent-neutral-900" />
              </td>
              <td className="table-cell">
                <Link to={`/admin/products/${p._id}`} className="group flex items-center gap-3">
                  <Img src={p.images[0]?.url} alt="" className="h-12 w-9 shrink-0 rounded-lg border border-neutral-200 object-cover" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 max-w-64 text-[13px] font-medium text-neutral-900 group-hover:underline">{p.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-neutral-500">
                      <span>{p.gender}</span> · <span>{p.categorySlug}</span>
                      {p.isFeatured && <span className="inline-flex items-center gap-0.5 text-amber-600"><Star size={9} fill="currentColor" /> Featured</span>}
                      {p.isBestSeller && <span className="inline-flex items-center gap-0.5 text-purple-600"><TrendingUp size={9} /> Best</span>}
                    </div>
                  </div>
                </Link>
              </td>
              <td className="table-cell font-mono text-xs text-neutral-500">{p.sku}</td>
              <td className="table-cell">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${p.tier === 'Premium' ? 'bg-neutral-900 text-white' : p.tier === 'Standard' ? 'bg-neutral-100 text-neutral-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {p.tier}
                </span>
              </td>
              <td className="table-cell">
                <p className="font-semibold text-neutral-900">{pkr(p.price)}</p>
                {p.compareAtPrice && <p className="text-[11px] text-neutral-400 line-through">{pkr(p.compareAtPrice)}</p>}
              </td>
              <td className="table-cell"><StockPill n={p.stock} /></td>
              <td className="table-cell"><StatusChip p={p} /></td>
              <td className="table-cell">
                <div className="flex items-center justify-end gap-1">
                  <Link to={`/admin/products/${p._id}`} className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900" aria-label="Edit">
                    <Pencil size={13} />
                  </Link>
                  {p.isActive ? (
                    <button onClick={() => onDisable(p)} className="rounded-lg p-2 text-neutral-500 transition hover:bg-amber-50 hover:text-amber-700" aria-label="Archive" title="Archive">
                      <Archive size={13} />
                    </button>
                  ) : (
                    <button onClick={() => onEnable(p)} className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50" aria-label="Restore" title="Restore">
                      <Eye size={13} />
                    </button>
                  )}
                  <button onClick={() => onRemove(p)} className="rounded-lg p-2 text-neutral-500 transition hover:bg-red-50 hover:text-red-700" aria-label="Delete" title="Delete permanently">
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GridView({ products, onEnable, onDisable, onRemove }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <div key={p._id} className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
          <Link to={`/admin/products/${p._id}`} className="block">
            <div className="relative aspect-[3/4] overflow-hidden bg-neutral-50">
              <Img src={p.images[0]?.url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
              <div className="absolute left-2 top-2 flex flex-col gap-1">
                <StatusChip p={p} />
                {p.stock === 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">SOLD OUT</span>}
              </div>
              {(p.isFeatured || p.isBestSeller) && (
                <div className="absolute right-2 top-2 flex gap-1">
                  {p.isFeatured && <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500 text-white" title="Featured"><Star size={11} fill="currentColor" /></span>}
                  {p.isBestSeller && <span className="grid h-6 w-6 place-items-center rounded-full bg-purple-600 text-white" title="Best seller"><TrendingUp size={11} /></span>}
                </div>
              )}
            </div>
          </Link>
          <div className="p-3">
            <Link to={`/admin/products/${p._id}`}>
              <p className="line-clamp-2 text-[12.5px] font-medium leading-snug text-neutral-900 hover:underline">{p.name}</p>
            </Link>
            <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
              <span className="font-mono">{p.sku}</span>
              <StockPill n={p.stock} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[14px] font-semibold text-neutral-900">{pkr(p.price)}</p>
              <div className="flex items-center gap-1">
                <Link to={`/admin/products/${p._id}`} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"><Pencil size={12} /></Link>
                {p.isActive ? (
                  <button onClick={() => onDisable(p)} className="rounded-lg p-1.5 text-neutral-500 hover:bg-amber-50 hover:text-amber-700"><Archive size={12} /></button>
                ) : (
                  <button onClick={() => onEnable(p)} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"><Eye size={12} /></button>
                )}
                <button onClick={() => onRemove(p)} className="rounded-lg p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onClear, hasFilters }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-neutral-200 bg-white py-20 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-neutral-100 text-neutral-500">
        <Package size={22} />
      </span>
      <p className="mt-4 text-sm font-medium text-neutral-700">No products match</p>
      <p className="mt-1 max-w-xs text-[11px] text-neutral-500">
        {hasFilters ? 'Try clearing the filters, or add a new product.' : 'You have no products yet — add your first one.'}
      </p>
      <div className="mt-5 flex items-center gap-2">
        {hasFilters && (
          <button onClick={onClear} className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50">Clear filters</button>
        )}
        <Link to="/admin/products/new" className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[11px] font-semibold text-white hover:bg-neutral-800">
          <Plus size={12} /> Add product
        </Link>
      </div>
    </div>
  );
}

/* ============================================================================
 * BulkEditModal — apply the same change to many products in one action.
 * Actions supported:
 *   - Set stock to N
 *   - Adjust stock by ±N
 *   - Set price / cost / compare-at
 *   - Adjust prices by ±N% (raise/lower entire selection)
 *   - Change tier
 *   - Toggle Featured / Best-seller / Active
 *   - Change status (active / draft)
 * User picks ONE action per apply — keeps the API call clean and predictable.
 * ========================================================================== */
function BulkEditModal({ count, onClose, onApply }) {
  const [action, setAction] = useState('setStock');
  const [numValue, setNumValue] = useState('');
  const [tier, setTier] = useState('Standard');
  const [bool, setBool] = useState(true);
  const [status, setStatus] = useState('active');
  const [busy, setBusy] = useState(false);

  const actions = [
    { key: 'setStock',       label: 'Set stock',                icon: Package,   hint: 'Overwrites current stock with the value below.' },
    { key: 'stockDelta',     label: 'Adjust stock by',          icon: TrendingUp,hint: 'Adds or subtracts. e.g. +50 to restock, −10 to reduce.' },
    { key: 'setPrice',       label: 'Set price (PKR)',          icon: DollarSign,hint: 'Overwrites current price.' },
    { key: 'setCost',        label: 'Set cost/wholesale',       icon: DollarSign,hint: 'Overwrites current cost price (used for profit calc).' },
    { key: 'priceChangePct', label: 'Adjust prices by %',       icon: TrendingUp,hint: 'Applies a % change to each product. e.g. +10 raises all prices by 10%.' },
    { key: 'setTier',        label: 'Change tier',              icon: Star,      hint: 'Overwrites tier (Economy / Standard / Premium).' },
    { key: 'setStatus',      label: 'Change status',            icon: Eye,       hint: 'Move to draft (hidden) or active (live).' },
    { key: 'toggleFeatured', label: 'Featured on/off',          icon: Star,      hint: 'Mark or unmark as Featured across the selection.' },
    { key: 'toggleBest',     label: 'Best-seller on/off',       icon: TrendingUp,hint: 'Mark or unmark as Best-seller.' },
  ];

  const active = actions.find((a) => a.key === action);
  const needsNum = ['setStock', 'stockDelta', 'setPrice', 'setCost', 'priceChangePct'].includes(action);

  const apply = async () => {
    const patch = {};
    if (action === 'setStock')       patch.stock = numValue;
    if (action === 'stockDelta')     patch.stockDelta = numValue;
    if (action === 'setPrice')       patch.price = numValue;
    if (action === 'setCost')        patch.costPrice = numValue;
    if (action === 'priceChangePct') patch.priceChangePct = numValue;
    if (action === 'setTier')        patch.tier = tier;
    if (action === 'setStatus')      patch.status = status;
    if (action === 'toggleFeatured') patch.isFeatured = bool;
    if (action === 'toggleBest')     patch.isBestSeller = bool;

    if (needsNum && (numValue === '' || numValue === null)) return;
    setBusy(true);
    try { await onApply(patch); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-obsidian/60 px-4 py-6 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Bulk edit</p>
            <h2 className="mt-0.5 font-display text-xl text-neutral-900">Update {count} product{count === 1 ? '' : 's'}</h2>
          </div>
          <button onClick={onClose} disabled={busy} className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {/* Action grid */}
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">What do you want to do?</p>
          <div className="grid grid-cols-2 gap-2">
            {actions.map((a) => {
              const A = a.icon;
              return (
                <button
                  key={a.key}
                  onClick={() => setAction(a.key)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[12px] transition ${
                    action === a.key
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  <A size={14} strokeWidth={action === a.key ? 2.2 : 1.8} />
                  <span className="font-semibold">{a.label}</span>
                </button>
              );
            })}
          </div>

          {/* Input area */}
          <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="mb-3 text-[11px] leading-relaxed text-neutral-600">{active?.hint}</p>

            {needsNum && (
              <div className="flex items-center gap-3">
                {action === 'stockDelta' && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setNumValue(numValue.startsWith('-') ? numValue.slice(1) : `-${numValue}`)} className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-600 hover:bg-neutral-100" title="Flip sign">
                      <Minus size={13} />
                    </button>
                  </div>
                )}
                <input
                  type="number"
                  value={numValue}
                  onChange={(e) => setNumValue(e.target.value)}
                  className="input flex-1 !text-lg !font-semibold"
                  placeholder={
                    action === 'setStock' ? '50'
                    : action === 'stockDelta' ? '+50 or -10'
                    : action === 'setPrice' ? '1800'
                    : action === 'setCost' ? '900'
                    : action === 'priceChangePct' ? '+10 (raises 10%)'
                    : ''
                  }
                  autoFocus
                />
                {action === 'priceChangePct' && <span className="text-neutral-500">%</span>}
                {(action === 'setPrice' || action === 'setCost') && <span className="text-neutral-500">PKR</span>}
              </div>
            )}

            {action === 'setTier' && (
              <div className="grid grid-cols-3 gap-2">
                {['Economy', 'Standard', 'Premium'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTier(t)}
                    className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition ${tier === t ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'}`}
                  >{t}</button>
                ))}
              </div>
            )}

            {action === 'setStatus' && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 'active', label: 'Active (live)', tone: 'text-emerald-700' },
                  { v: 'draft',  label: 'Draft (hidden)', tone: 'text-amber-700' },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setStatus(o.v)}
                    className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition ${status === o.v ? 'border-neutral-900 bg-neutral-900 text-white' : `border-neutral-200 bg-white ${o.tone} hover:border-neutral-400`}`}
                  >{o.label}</button>
                ))}
              </div>
            )}

            {(action === 'toggleFeatured' || action === 'toggleBest') && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setBool(true)}  className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition ${bool  ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'}`}>Turn ON</button>
                <button onClick={() => setBool(false)} className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition ${!bool ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'}`}>Turn OFF</button>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
            ⚠️ This will apply to <b>{count} product{count === 1 ? '' : 's'}</b> at once and cannot be undone.
            Make sure the correct rows are selected before confirming.
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          <button onClick={onClose} disabled={busy} className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40">Cancel</button>
          <button
            onClick={apply}
            disabled={busy || (needsNum && (numValue === '' || numValue === null))}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-[12px] font-semibold uppercase tracking-widest text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            <Save size={13} /> {busy ? 'Applying…' : `Apply to ${count} product${count === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
