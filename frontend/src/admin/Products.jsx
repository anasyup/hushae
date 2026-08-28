import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Archive, Copy, Eye, FileUp, LayoutGrid, List, Minus, Package,
  Pencil, Plus, Save, Search, Trash2, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';
import CsvImport from './CsvImport';
import PaginationBar from './PaginationBar';
import './products-atelier.css';

/* ===========================================================================
 * Products — ATELIER luxury theme (same family as the Overview reference:
 * #f8f8f7 canvas, white cards, Inter, small premium controls, whisper
 * shadows). All working features preserved: saved views, filters, bulk
 * edit / activate / archive, inline stock stepper, CSV import/export,
 * duplicate / publish / archive / delete, deep links, mobile cards.
 * ========================================================================== */

const PER_PAGE = 50; // legacy cap reference — paging is server-side now

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
    // Deep links: ?q= name search · ?stock=low|out · ?active=0 · ?status=
    q: searchParams.get('q') || '',
    category: '', gender: '', tier: '',
    stock: searchParams.get('stock') === 'out' ? 'out' : (searchParams.get('stock') === 'low' ? 'low' : ''),
    status: searchParams.get('active') === '0' ? 'disabled' : (searchParams.get('status') || ''),
  });

  /* Server-side pagination (reference bar): the catalog can outgrow any
     client slice, so the DB returns one page + totals + saved-view counts. */
  const [dq, setDq] = useState(''); // debounced search → server
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(20);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(null);

  const load = () => {
    const sp = new URLSearchParams({ page: String(page), per: String(per) });
    Object.entries(f).forEach(([k, v]) => {
      if (!v) return;
      if (k === 'status' && v === 'disabled') sp.set('active', '0');
      else if (k !== 'q') sp.set(k, v);
    });
    if (dq) sp.set('q', dq);
    api(`/products/admin/list?${sp}`, { token: auth.token })
      .then((d) => { setList(d.products); setTotal(d.total || 0); setCounts(d.counts || null); setSelected(new Set()); setErr(''); })
      .catch(() => { setList([]); setTotal(0); setErr('Something prevented the catalog from loading.'); });
  };
  useEffect(load, [f.category, f.gender, f.tier, f.stock, f.status, page, per, dq]); // eslint-disable-line
  useEffect(() => {
    const s = searchParams.get('active') === '0' ? 'disabled' : (searchParams.get('status') || '');
    setF((x) => (x.status === s ? x : { ...x, status: s }));
  }, [searchParams]);

  /* Sidebar "Import / Export" destination → /admin/products?import=1.
     The CSV modal opens once; the flag is stripped so refresh never re-opens. */
  useEffect(() => {
    if (searchParams.get('import') !== '1') return;
    setCsvOpen(true);
    const n = new URLSearchParams(searchParams);
    n.delete('import');
    setSearchParams(n, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => { api('/categories?all=1').then((d) => setCats(d.categories)).catch(() => {}); }, []);

  /* The page IS the server slice — no client filtering. Debounced search
     and any view change reset to page 1. */
  useEffect(() => {
    const t = setTimeout(() => { setDq(f.q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [f.q]);
  useEffect(() => { setPage(1); }, [f.gender, f.category, f.tier, f.stock, f.status, per, view]);

  const rows = Array.isArray(list) ? list : [];
  const pageCount = Math.max(1, Math.ceil(total / per));
  const summary = counts || { total: 0, live: 0, draft: 0, archived: 0, oos: 0, low: 0 };

  /* ── Row actions ─────────────────────────────────────────────────────── */
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

  /* ── Selection + bulk ────────────────────────────────────────────────── */
  const toggleSel = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleSelAll = () => {
    const pageIds = rows.map((p) => p._id);
    setSelected((s) => {
      const allOnPage = pageIds.length > 0 && pageIds.every((id) => s.has(id));
      const n = new Set(s);
      if (allOnPage) pageIds.forEach((id) => n.delete(id));
      else pageIds.forEach((id) => n.add(id));
      return n;
    });
  };

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
     reload on failure. Backend rings the low-stock bell only on the downward
     crossing, so tapping − on an already-low row stays quiet. */
  const adjustStock = async (p, delta) => {
    const next = Math.max(0, (p.stock || 0) + delta);
    setList((l) => (Array.isArray(l) ? l.map((x) => (x._id === p._id ? { ...x, stock: next } : x)) : l));
    try {
      await api(`/products/${p._id}/stock`, { method: 'PATCH', token: auth.token, body: { delta } });
    } catch (ex) { toast(ex.message || 'Stock update failed'); load(); }
  };

  const clearFilters = () => setF({ q: '', category: '', gender: '', tier: '', stock: '', status: '' });
  const hasFilters = !!(f.q || f.category || f.gender || f.tier || f.stock || f.status);
  const extraFilterCount = [f.gender, f.tier, f.stock].filter(Boolean).length;

  /* Saved views — the stats strip IS the view switcher. One click lands on
     one clear list; status views and stock views are mutually exclusive. */
  const metrics = [
    { label: 'All', value: summary.total, note: null, onClick: () => setF({ ...f, status: '', stock: '' }), active: !f.status && !f.stock },
    { label: 'Active', value: summary.live, note: { text: 'Live', tone: 'pa-note-green' }, onClick: () => setF({ ...f, status: 'active', stock: '' }), active: f.status === 'active' },
    { label: 'Draft', value: summary.draft, note: { text: 'Hidden', tone: 'pa-note-blue' }, onClick: () => setF({ ...f, status: 'draft', stock: '' }), active: f.status === 'draft' },
    { label: 'Archived', value: summary.archived, note: { text: 'Stored', tone: 'pa-note-gray' }, onClick: () => setF({ ...f, status: 'disabled', stock: '' }), active: f.status === 'disabled' },
    { label: 'Low stock', value: summary.low, note: { text: '≤ 5 left', tone: 'pa-note-yellow' }, onClick: () => setF({ ...f, stock: 'low', status: '' }), active: f.stock === 'low' },
    { label: 'Out of stock', value: summary.oos, note: { text: 'Reorder', tone: 'pa-note-red' }, onClick: () => setF({ ...f, stock: 'out', status: '' }), active: f.stock === 'out' },
  ];

  const allSelected = rows.length > 0 && rows.every((p) => selected.has(p._id));

  return (
    <AdminLayout title="Products">
      <div className="pa-outer">
        <div className="pa-wrap">

          {/* ── Page head ─────────────────────────────────────────────── */}
          <div className="pa-head">
            <div>
              <h1>Products</h1>
              <p>Catalog management — search, filter, edit in place.</p>
            </div>
            <div className="pa-head-actions">
              <button type="button" onClick={() => setCsvOpen(true)} className="pa-btn-sm">
                <FileUp size={12} strokeWidth={2.2} /> Import / Export
              </button>
              <Link to="/admin/products/new" className="pa-btn-black" style={{ textDecoration: 'none' }}>
                <Plus size={12} strokeWidth={2.4} /> Add product
              </Link>
            </div>
          </div>

          {/* ── Stats = saved views ───────────────────────────────────── */}
          <div className="pa-stats">
            {metrics.map((m) => (
              <button key={m.label} type="button" onClick={m.onClick} aria-pressed={m.active} className={`pa-stat ${m.active ? 'active' : ''}`}>
                <p className="pa-stat-label">{m.label}</p>
                <p className="pa-stat-val">{list === null ? '—' : m.value.toLocaleString()}</p>
                {m.note && <span className={`pa-stat-note ${m.note.tone}`}>{m.note.text}</span>}
              </button>
            ))}
          </div>

          {/* ── Toolbar ───────────────────────────────────────────────── */}
          <div className="pa-card pa-toolbar">
            <div className="pa-search">
              <Search size={13} strokeWidth={2} />
              <input
                value={f.q}
                onChange={(e) => setF({ ...f, q: e.target.value })}
                placeholder="Search products, SKUs, categories…"
                aria-label="Search products"
              />
            </div>
            <select
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value })}
              aria-label="Status"
              className="pa-select"
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
              className="pa-select"
            >
              <option value="">Category</option>
              {cats.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name} ({c.gender?.[0]?.toUpperCase()})</option>
              ))}
            </select>
            <button type="button" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} className="pa-btn-sm">
              More{extraFilterCount > 0 ? ` · ${extraFilterCount}` : ''}
            </button>
            <div className="pa-view-toggle">
              <button type="button" onClick={() => setView('list')} aria-pressed={view === 'list'} title="List view" className={`pa-view-btn ${view === 'list' ? 'on' : ''}`}>
                <List size={13} strokeWidth={2} />
              </button>
              <button type="button" onClick={() => setView('grid')} aria-pressed={view === 'grid'} title="Grid view" className={`pa-view-btn ${view === 'grid' ? 'on' : ''}`}>
                <LayoutGrid size={13} strokeWidth={2} />
              </button>
            </div>
          </div>

          {moreOpen && (
            <div className="pa-card pa-more-row">
              <select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} aria-label="Gender" className="pa-select" style={{ maxWidth: 'none' }}>
                <option value="">All genders</option>
                <option value="women">Women</option>
                <option value="men">Men</option>
              </select>
              <select value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })} aria-label="Tier" className="pa-select" style={{ maxWidth: 'none' }}>
                <option value="">All tiers</option>
                <option value="Economy">Economy</option>
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
              </select>
              <select value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} aria-label="Stock" className="pa-select" style={{ maxWidth: 'none' }}>
                <option value="">Any stock</option>
                <option value="low">Low (≤5)</option>
                <option value="out">Out of stock</option>
              </select>
            </div>
          )}

          {hasFilters && (
            <p className="pa-filter-note">
              Filters active · <button type="button" onClick={clearFilters}>Clear</button>
            </p>
          )}

          {/* ── Bulk selection bar ────────────────────────────────────── */}
          {selected.size > 0 && (
            <div className="pa-bulk">
              <span className="pa-bulk-count">{selected.size} selected</span>
              <button type="button" onClick={() => setBulkOpen(true)} className="pa-btn-black" style={{ height: 30, fontSize: 11 }}>
                <Pencil size={11} strokeWidth={2.2} /> Edit
              </button>
              <button type="button" onClick={() => bulkQuick({ isActive: true }, 'Activated')} className="pa-btn-sm">
                <Eye size={11} strokeWidth={2.2} /> Activate
              </button>
              <button type="button" onClick={() => bulkQuick({ isActive: false }, 'Archived')} className="pa-btn-sm">
                <Archive size={11} strokeWidth={2.2} /> Archive
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className="pa-text-link pa-clear">Clear</button>
            </div>
          )}

          {/* ── States ────────────────────────────────────────────────── */}
          {err && (
            <div className="pa-card pa-state">
              <div className="pa-state-icon"><AlertTriangle size={18} strokeWidth={1.8} /></div>
              <h3>Unable to load products</h3>
              <p>{err}</p>
              <button type="button" onClick={() => { setList(null); setErr(''); load(); }} className="pa-btn-black">Try again</button>
            </div>
          )}

          {list === null && !err && (
            <div className="pa-card pa-skeleton">
              {Array.from({ length: 7 }).map((_, i) => <div key={i} className="pa-sk-row" />)}
            </div>
          )}

          {!err && list !== null && rows.length === 0 && (
            <div className="pa-card pa-state">
              <div className="pa-state-icon"><Package size={18} strokeWidth={1.8} /></div>
              <h3>{hasFilters ? 'No products match' : 'Your catalog is empty'}</h3>
              <p>{hasFilters ? 'No products match these filters. Clear them or try a different search.' : 'Add your first product to start selling.'}</p>
              {hasFilters
                ? <button type="button" onClick={clearFilters} className="pa-btn-sm">Clear filters</button>
                : <Link to="/admin/products/new" className="pa-btn-black" style={{ textDecoration: 'none', display: 'inline-flex' }}><Plus size={12} strokeWidth={2.4} /> Add product</Link>}
            </div>
          )}

          {/* ── List view: table (≥900px) + mobile cards ──────────────── */}
          {!err && rows.length > 0 && view === 'list' && (
            <>
              <div className="pa-card pa-tbl-card">
                <div className="pa-tbl-scroll">
                  <table className="pa-tbl">
                    <thead>
                      <tr>
                        <th className="pa-th-chk"><input type="checkbox" className="pa-input-chk" checked={allSelected} onChange={toggleSelAll} aria-label="Select all on this page" /></th>
                        <th className="pa-th-img" />
                        <th>Product</th>
                        <th style={{ width: '13%' }}>SKU</th>
                        <th style={{ width: '11%' }}>Price</th>
                        <th style={{ width: '14%' }}>Inventory</th>
                        <th className="pa-hide-xl" style={{ width: '12%' }}>Category</th>
                        <th style={{ width: '10%' }}>Status</th>
                        <th className="pa-hide-xl" style={{ width: '10%' }}>Updated</th>
                        <th className="pa-th-act" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((p, i) => (
                        <ProductRow
                          key={p._id}
                          p={p}
                          i={i}
                          selected={selected.has(p._id)}
                          onToggleSel={() => toggleSel(p._id)}
                          onEnable={enable}
                          onDisable={disable}
                          onPublish={publish}
                          onRemove={remove}
                          onDuplicate={duplicate}
                          onAdjust={(d) => adjustStock(p, d)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pa-mcards">
                {rows.map((p) => (
                  <MobileCard
                    key={p._id}
                    p={p}
                    onEnable={enable}
                    onDisable={disable}
                    onPublish={publish}
                    onRemove={remove}
                    onDuplicate={duplicate}
                    onAdjust={(d) => adjustStock(p, d)}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Grid view ─────────────────────────────────────────────── */}
          {!err && rows.length > 0 && view === 'grid' && (
            <div className="pa-grid">
              {rows.map((p) => (
                <GridCard
                  key={p._id}
                  p={p}
                  onEnable={enable}
                  onDisable={disable}
                  onPublish={publish}
                  onRemove={remove}
                  onDuplicate={duplicate}
                  onAdjust={(d) => adjustStock(p, d)}
                />
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <PaginationBar
              page={page}
              pages={pageCount}
              total={total}
              per={per}
              onPage={setPage}
              onPer={(v) => { setPer(v); setPage(1); }}
            />
          )}

        </div>
      </div>

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

/* ── helpers ─────────────────────────────────────────────────────────────── */

function statusBadge(p) {
  if (p.status === 'draft') return { label: 'Draft', cls: 'pa-b-blue' };
  if (!p.isActive) return { label: 'Archived', cls: 'pa-b-gray' };
  return { label: 'Active', cls: 'pa-b-green' };
}

function StockBadge({ n }) {
  if (n === 0) return <span className="pa-badge pa-b-red">Out of stock</span>;
  if (n <= 5) return <span className="pa-badge pa-b-yellow">Low · {n} left</span>;
  return null;
}

function StockStepper({ n, onAdjust }) {
  return (
    <div className="pa-stock">
      <button type="button" className="pa-action-btn" onClick={() => onAdjust(-1)} disabled={n <= 0} aria-label="Decrease stock by one">
        <Minus size={11} strokeWidth={2.2} />
      </button>
      <span className="pa-stock-num">{n}</span>
      <button type="button" className="pa-action-btn" onClick={() => onAdjust(1)} aria-label="Increase stock by one">
        <Plus size={11} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function RowActions({ p, onEnable, onDisable, onPublish, onRemove, onDuplicate }) {
  return (
    <div className="pa-row-actions">
      {p.status === 'draft' && (
        <button type="button" onClick={() => onPublish(p)} className="pa-text-link" title="Publish">Publish</button>
      )}
      <Link to={`/admin/products/${p._id}`} className="pa-action-btn" aria-label="Edit" title="Edit">
        <Pencil size={12} strokeWidth={2} />
      </Link>
      <button type="button" onClick={() => onDuplicate(p)} className="pa-action-btn" aria-label="Duplicate" title="Duplicate">
        <Copy size={12} strokeWidth={2} />
      </button>
      {p.isActive ? (
        <button type="button" onClick={() => onDisable(p)} className="pa-action-btn" aria-label="Archive" title="Archive">
          <Archive size={12} strokeWidth={2} />
        </button>
      ) : (
        <button type="button" onClick={() => onEnable(p)} className="pa-action-btn" aria-label="Restore" title="Restore">
          <Eye size={12} strokeWidth={2} />
        </button>
      )}
      <button type="button" onClick={() => onRemove(p)} className="pa-action-btn danger" aria-label="Delete permanently" title="Delete permanently">
        <Trash2 size={12} strokeWidth={2} />
      </button>
    </div>
  );
}

function ProductRow({ p, i, selected, onToggleSel, onEnable, onDisable, onPublish, onRemove, onDuplicate, onAdjust }) {
  const st = statusBadge(p);
  return (
    <tr className={selected ? 'selected' : ''} style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}>
      <td><input type="checkbox" className="pa-input-chk" checked={selected} onChange={onToggleSel} aria-label={`Select ${p.name}`} /></td>
      <td>
        <Link to={`/admin/products/${p._id}`} aria-label={`Open ${p.name}`}>
          <Img src={p.images?.[0]?.url} alt="" className="pa-thumb" />
        </Link>
      </td>
      <td style={{ minWidth: 0 }}>
        <Link to={`/admin/products/${p._id}`} className="pa-name">{p.name}</Link>
        <span className="pa-sub">
          {p.gender}{p.tier ? ` · ${p.tier}` : ''}
          {p.isFeatured ? ' · Featured' : ''}
          {p.isBestSeller ? ' · Best' : ''}
          {p.onSale ? ' · Sale' : ''}
        </span>
      </td>
      <td><span className="pa-sku">{p.sku || '—'}</span></td>
      <td>
        <p className="pa-price" style={{ margin: 0 }}>{pkr(p.price)}</p>
        {p.onSale === true && p.compareAtPrice ? <p className="pa-compare" style={{ margin: 0 }}>{pkr(p.compareAtPrice)}</p> : null}
      </td>
      <td>
        <StockStepper n={p.stock} onAdjust={onAdjust} />
        <div className="pa-stock-badges"><StockBadge n={p.stock} /></div>
      </td>
      <td className="pa-hide-xl"><span className="pa-cell-muted">{p.categorySlug || '—'}</span></td>
      <td><span className={`pa-badge ${st.cls}`}><span className="pa-dot" aria-hidden />{st.label}</span></td>
      <td className="pa-hide-xl"><span className="pa-cell-muted">{p.updatedAt ? fmtDate(p.updatedAt) : '—'}</span></td>
      <td><RowActions p={p} onEnable={onEnable} onDisable={onDisable} onPublish={onPublish} onRemove={onRemove} onDuplicate={onDuplicate} /></td>
    </tr>
  );
}

function MobileCard({ p, onEnable, onDisable, onPublish, onRemove, onDuplicate, onAdjust }) {
  const st = statusBadge(p);
  return (
    <div className="pa-mcard">
      <Link to={`/admin/products/${p._id}`} aria-label={`Open ${p.name}`}>
        <Img src={p.images?.[0]?.url} alt="" className="pa-mcard-img" />
      </Link>
      <div className="pa-mcard-main">
        <Link to={`/admin/products/${p._id}`} className="pa-name">{p.name}</Link>
        <span className="pa-sub">{p.sku || '—'}</span>
        <div className="pa-mcard-row">
          <p className="pa-price" style={{ margin: 0 }}>{pkr(p.price)}</p>
          <span className={`pa-badge ${st.cls}`}><span className="pa-dot" aria-hidden />{st.label}</span>
        </div>
        <div className="pa-mcard-row">
          <StockStepper n={p.stock} onAdjust={onAdjust} />
          <StockBadge n={p.stock} />
        </div>
        <div className="pa-mcard-row">
          <RowActions p={p} onEnable={onEnable} onDisable={onDisable} onPublish={onPublish} onRemove={onRemove} onDuplicate={onDuplicate} />
        </div>
      </div>
    </div>
  );
}

function GridCard({ p, onEnable, onDisable, onPublish, onRemove, onDuplicate, onAdjust }) {
  const st = statusBadge(p);
  return (
    <div className="pa-gcard">
      <Link to={`/admin/products/${p._id}`} className="pa-gcard-img" aria-label={`Open ${p.name}`}>
        <Img src={p.images?.[0]?.url} alt="" />
      </Link>
      <div className="pa-gcard-body">
        <div className="pa-gcard-top">
          <Link to={`/admin/products/${p._id}`} className="pa-name" style={{ whiteSpace: 'normal' }}>{p.name}</Link>
          <span className={`pa-badge ${st.cls}`}><span className="pa-dot" aria-hidden />{st.label}</span>
        </div>
        <span className="pa-sub" style={{ marginTop: 4 }}>{p.sku || '—'}</span>
        <div className="pa-gcard-foot">
          <p className="pa-price" style={{ margin: 0 }}>{pkr(p.price)}</p>
          <StockStepper n={p.stock} onAdjust={onAdjust} />
        </div>
        <div style={{ marginTop: 10 }}>
          <RowActions p={p} onEnable={onEnable} onDisable={onDisable} onPublish={onPublish} onRemove={onRemove} onDuplicate={onDuplicate} />
        </div>
      </div>
    </div>
  );
}

/* ── Bulk edit modal — ATELIER ───────────────────────────────────────────── */
function BulkEditModal({ count, onClose, onApply }) {
  const [action, setAction] = useState('setStock');
  const [numValue, setNumValue] = useState('');
  const [tier, setTier] = useState('Standard');
  const [bool, setBool] = useState(true);
  const [status, setStatus] = useState('active');
  const [busy, setBusy] = useState(false);

  const actions = [
    { key: 'setStock', label: 'Set stock', hint: 'Overwrites current stock with the value below.' },
    { key: 'stockDelta', label: 'Adjust stock by', hint: 'Adds or subtracts — e.g. +50 to restock, −10 to reduce.' },
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
    <div className="pa-modal-overlay" onClick={onClose}>
      <div className="pa-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Bulk edit">
        <div className="pa-modal-head">
          <div>
            <h3>Bulk edit</h3>
            <p>Update {count} product{count === 1 ? '' : 's'} in one pass</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="pa-action-btn" aria-label="Close">
            <X size={13} strokeWidth={2.2} />
          </button>
        </div>

        <div className="pa-modal-body">
          <p className="pa-modal-label">What do you want to do?</p>
          <div className="pa-modal-grid">
            {actions.map((a) => (
              <button key={a.key} type="button" onClick={() => setAction(a.key)} className={`pa-modal-action ${action === a.key ? 'on' : ''}`}>
                {a.label}
              </button>
            ))}
          </div>

          <p className="pa-modal-hint">{active?.hint}</p>
          {needsNum && (
            <input
              type="number"
              value={numValue}
              onChange={(e) => setNumValue(e.target.value)}
              className="pa-modal-input"
              placeholder={action === 'setStock' ? '50' : action === 'stockDelta' ? '+50 or -10' : action === 'priceChangePct' ? '10' : '1800'}
              autoFocus
            />
          )}
          {action === 'setTier' && (
            <div className="pa-modal-seg">
              {['Economy', 'Standard', 'Premium'].map((t) => (
                <button key={t} type="button" onClick={() => setTier(t)} className={tier === t ? 'on' : ''}>{t}</button>
              ))}
            </div>
          )}
          {action === 'setStatus' && (
            <div className="pa-modal-seg cols-2">
              {[{ v: 'active', label: 'Active (live)' }, { v: 'draft', label: 'Draft (hidden)' }].map((o) => (
                <button key={o.v} type="button" onClick={() => setStatus(o.v)} className={status === o.v ? 'on' : ''}>{o.label}</button>
              ))}
            </div>
          )}
          {(action === 'toggleFeatured' || action === 'toggleBest' || action === 'toggleSale') && (
            <div className="pa-modal-seg cols-2">
              <button type="button" onClick={() => setBool(true)} className={bool ? 'on' : ''}>Turn on</button>
              <button type="button" onClick={() => setBool(false)} className={!bool ? 'on' : ''}>Turn off</button>
            </div>
          )}
        </div>

        <div className="pa-modal-foot">
          <p className="pa-modal-note">Applies to {count} product{count === 1 ? '' : 's'}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} disabled={busy} className="pa-btn-sm">Cancel</button>
            <button
              type="button"
              onClick={apply}
              disabled={busy || (needsNum && (numValue === '' || numValue === null))}
              className="pa-btn-black"
            >
              <Save size={12} strokeWidth={2.2} /> {busy ? 'Applying…' : `Apply to ${count}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
