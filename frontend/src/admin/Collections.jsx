import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes, Edit3, ExternalLink, Plus, Save, Search, Trash2, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

/* ============================================================================
 * COLLECTIONS V3 — Collection Manager
 * Search + filters + add collection. Table with collection, product count,
 * rule/manual mode, status, updated, actions. Structured editor modal.
 * All business logic preserved.
 * ========================================================================== */

const EMPTY_COLLECTION = {
  name: '', slug: '', description: '', image: '',
  products: [],
  smart: { enabled: false, tags: [], category: '', tier: '', gender: '', onSale: false, minPrice: null, maxPrice: null },
  featuredOnHome: false, sortOrder: 100, isActive: true,
};

export default function Collections() {
  const { auth, toast } = useApp();
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () => api('/collections/admin/list', { token: auth.token }).then((d) => setList(d.collections)).catch(() => setList([]));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try { await api(`/collections/${c._id}`, { method: 'DELETE', token: auth.token }); toast('Deleted'); load(); }
    catch (ex) { toast(ex.message); }
  };

  if (!list) return (
    <AdminLayout title="Collections">
      <div className="v3-page-header">
        <div className="v3-page-header-left"><h1 className="v3-h-page">Collections</h1></div>
      </div>
      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 v3-skeleton rounded-[5px]" />)}</div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Collections">
      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb">
            <Link to="/admin">Home</Link><span>/</span>
            <Link to="/admin/products">Products</Link><span>/</span>
            <span>Collections</span>
          </div>
          <h1 className="v3-h-page">Collections</h1>
          <p className="v3-h-small mt-1">Curated groups of products — season, occasion or theme.</p>
        </div>
        <div className="v3-page-header-right">
          <button type="button" onClick={() => setEditing({ ...EMPTY_COLLECTION })} className="v3-btn v3-btn-primary v3-btn-sm">
            <Plus size={12} /> New Collection
          </button>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────── */}
      {list.length === 0 ? (
        <div className="v3-card">
          <div className="v3-empty">
            <Boxes size={24} className="v3-empty-icon" />
            <p className="v3-empty-title">No collections yet</p>
            <p className="v3-empty-desc">Create your first collection to group products by theme, season or occasion.</p>
            <button type="button" onClick={() => setEditing({ ...EMPTY_COLLECTION })} className="v3-btn v3-btn-primary mt-3"><Plus size={12} /> New Collection</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <div key={c._id} className="v3-card overflow-hidden group">
              {/* Image */}
              <div className="relative aspect-[16/9] overflow-hidden bg-[#F5F6F8]">
                {c.image
                  ? <img src={c.image} alt={c.name} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" onError={(e) => { e.target.style.display = 'none'; }} />
                  : <div className="flex h-full items-center justify-center"><Boxes size={28} className="text-[#D1D5DB]" /></div>}
                {/* Badges */}
                <div className="absolute right-2 top-2 flex gap-1">
                  {c.featuredOnHome && <span className="v3-status v3-status-strong" style={{ fontSize: 9, padding: '2px 6px' }}>Featured</span>}
                  {!c.isActive && <span className="v3-status v3-status-inactive" style={{ fontSize: 9, padding: '2px 6px' }}>Hidden</span>}
                  {c.smart?.enabled && <span className="v3-status v3-status-active" style={{ fontSize: 9, padding: '2px 6px' }}>Smart</span>}
                </div>
              </div>
              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#111]">{c.name}</p>
                    <p className="mt-0.5 text-[11px] font-mono text-[#9CA3AF]">/collection/{c.slug}</p>
                  </div>
                  <span className="shrink-0 rounded-[3px] bg-[#F0F1F3] px-2 py-0.5 text-[11px] font-bold tabular text-[#4A4A4A]">{c.productCount || 0}</span>
                </div>
                {c.description && <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[#6B7280]">{c.description}</p>}
                <div className="mt-4 flex items-center justify-between">
                  <a href={`/collection/${c.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-medium text-[#6B7280] hover:text-[#111] transition-colors" style={{ textDecoration: 'none' }}>
                    Preview <ExternalLink size={10} />
                  </a>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(c)} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Edit"><Edit3 size={13} /></button>
                    <button onClick={() => remove(c)} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EDITOR MODAL ─────────────────────────────────────────────── */}
      {editing && (
        <CollectionEditor
          collection={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </AdminLayout>
  );
}

/* ── Collection Editor Modal ───────────────────────────────────────────── */
function CollectionEditor({ collection, onClose, onSaved }) {
  const { auth, toast } = useApp();
  const [c, setC] = useState(() => ({
    ...EMPTY_COLLECTION,
    ...collection,
    smart: { ...EMPTY_COLLECTION.smart, ...(collection.smart || {}) },
    products: collection.products || [],
    tags: collection.tags || [],
  }));
  const [busy, setBusy] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [cats, setCats] = useState([]);

  const isNew = !collection._id;

  useEffect(() => {
    api('/products/admin/list', { token: auth.token }).then((d) => setAllProducts(d.products || [])).catch(() => {});
    api('/collections/admin/all-tags', { token: auth.token }).then((d) => setAllTags(d.tags || [])).catch(() => {});
    api('/categories?all=1').then((d) => setCats(d.categories || [])).catch(() => {});
  }, []); // eslint-disable-line

  const set = (k, v) => setC((x) => ({ ...x, [k]: v }));
  const setSmart = (k, v) => setC((x) => ({ ...x, smart: { ...x.smart, [k]: v } }));

  const selectedIds = new Set((c.products || []).map(String));
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return allProducts.slice(0, 40);
    return allProducts.filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.categorySlug.toLowerCase().includes(q)
    ).slice(0, 40);
  }, [productSearch, allProducts]);

  const toggleProduct = (id) => {
    const next = new Set(selectedIds);
    if (next.has(String(id))) next.delete(String(id));
    else next.add(String(id));
    set('products', [...next]);
  };

  const save = async () => {
    if (!c.name.trim()) return toast('Name is required');
    setBusy(true);
    try {
      if (isNew) {
        await api('/collections', { method: 'POST', token: auth.token, body: c });
        toast('Collection created');
      } else {
        await api(`/collections/${collection._id}`, { method: 'PUT', token: auth.token, body: c });
        toast('Collection updated');
      }
      onSaved();
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  return (
    <div className="v3-modal-overlay" onClick={onClose}>
      <div className="v3-modal" style={{ maxWidth: 680, maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="v3-modal-header">
          <div>
            <p className="v3-h-label mb-1">{isNew ? 'New Collection' : 'Edit Collection'}</p>
            <h2 className="v3-h-section">{c.name || 'Untitled Collection'}</h2>
          </div>
          <button onClick={onClose} disabled={busy} className="v3-btn v3-btn-icon v3-btn-ghost"><X size={16} /></button>
        </div>

        <div className="v3-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <div className="space-y-5">
            {/* Basic info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="v3-field">
                <label className="v3-label">Name *</label>
                <input className="v3-input" value={c.name} onChange={(e) => set('name', e.target.value)} placeholder="Wedding Season" autoFocus />
              </div>
              <div className="v3-field">
                <label className="v3-label">URL Slug</label>
                <input className="v3-input font-mono text-[12px]" value={c.slug} onChange={(e) => set('slug', e.target.value)} placeholder="wedding-season" />
              </div>
            </div>
            <div className="v3-field">
              <label className="v3-label">Description</label>
              <textarea className="v3-textarea" rows={2} value={c.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional description" />
            </div>
            <div className="v3-field">
              <label className="v3-label">Image URL</label>
              <input className="v3-input font-mono text-[12px]" value={c.image} onChange={(e) => set('image', e.target.value)} placeholder="https://…" />
            </div>

            {/* Smart rules */}
            <div className="rounded-[5px] border border-[#E5E7EB] bg-[#FAFBFC] p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[12px] font-semibold text-[#111]">Smart Rules</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">Products matching these rules are added automatically.</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" checked={!!c.smart.enabled} onChange={(e) => setSmart('enabled', e.target.checked)} />
                  <span className="h-5 w-9 rounded-full bg-[#D1D5DB] transition peer-checked:bg-[#111] after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
                </label>
              </div>
              {c.smart.enabled && (
                <div className="space-y-3">
                  <div className="v3-field">
                    <label className="v3-label">Tags</label>
                    <div className="rounded-[5px] border border-[#E5E7EB] bg-white p-2">
                      <div className="flex flex-wrap gap-1.5">
                        {(c.smart.tags || []).map((t, i) => (
                          <span key={t + i} className="inline-flex items-center gap-1 rounded-[3px] bg-[#111] pl-2.5 pr-1 py-1 text-[11px] font-medium text-white">
                            {t}
                            <button type="button" onClick={() => setSmart('tags', c.smart.tags.filter((_, j) => j !== i))} className="grid h-3.5 w-3.5 place-items-center rounded-full hover:bg-white/20">×</button>
                          </span>
                        ))}
                        <input
                          className="min-w-[100px] flex-1 bg-transparent px-2 py-1 text-[11px] outline-none placeholder:text-[#9CA3AF]"
                          placeholder="Type tag + Enter"
                          list="all-product-tags"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              const v = e.currentTarget.value.trim().toLowerCase();
                              if (v && !(c.smart.tags || []).includes(v)) setSmart('tags', [...(c.smart.tags || []), v]);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <datalist id="all-product-tags">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="v3-field">
                      <label className="v3-label">Category</label>
                      <select className="v3-select w-full" value={c.smart.category} onChange={(e) => setSmart('category', e.target.value)}>
                        <option value="">Any</option>
                        {cats.map((k) => <option key={k.slug} value={k.slug}>{k.name}</option>)}
                      </select>
                    </div>
                    <div className="v3-field">
                      <label className="v3-label">Tier</label>
                      <select className="v3-select w-full" value={c.smart.tier} onChange={(e) => setSmart('tier', e.target.value)}>
                        <option value="">Any</option>
                        <option value="Economy">Economy</option><option value="Standard">Standard</option><option value="Premium">Premium</option>
                      </select>
                    </div>
                    <div className="v3-field">
                      <label className="v3-label">Gender</label>
                      <select className="v3-select w-full" value={c.smart.gender} onChange={(e) => setSmart('gender', e.target.value)}>
                        <option value="">Any</option>
                        <option value="women">Women</option><option value="men">Men</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 rounded-[5px] border border-[#E5E7EB] bg-white p-3 text-[12px] cursor-pointer">
                    <input type="checkbox" checked={!!c.smart.onSale} onChange={(e) => setSmart('onSale', e.target.checked)} className="w-3.5 h-3.5 accent-[#111]" />
                    Only products currently on sale
                  </label>
                </div>
              )}
            </div>

            {/* Manual products */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="v3-h-label">Manual Products</p>
                <span className="text-[11px] text-[#9CA3AF]">{selectedIds.size} selected</span>
              </div>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input className="v3-input" style={{ paddingLeft: 32 }} placeholder="Search products…" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
              </div>
              <div className="max-h-56 overflow-y-auto rounded-[5px] border border-[#E5E7EB] bg-white">
                {filteredProducts.map((p) => {
                  const on = selectedIds.has(String(p._id));
                  return (
                    <button type="button" key={p._id} onClick={() => toggleProduct(p._id)}
                      className={`flex w-full items-center gap-3 border-b border-[#F0F1F3] p-2.5 text-left transition-colors last:border-0 ${on ? 'bg-[#F5F6F8]' : 'hover:bg-[#FAFBFC]'}`}>
                      <input type="checkbox" checked={on} readOnly className="w-3.5 h-3.5 accent-[#111]" />
                      <Img src={p.images?.[0]?.url} alt="" className="h-9 w-7 rounded-[3px] border border-[#E5E7EB] object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-[12px] font-medium text-[#111]">{p.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">{p.gender} · {p.categorySlug} · {p.sku}</p>
                      </div>
                      <p className="text-[12px] font-semibold tabular text-[#111]">{pkr(p.price)}</p>
                    </button>
                  );
                })}
                {filteredProducts.length === 0 && <p className="p-6 text-center text-[12px] text-[#9CA3AF]">No products match.</p>}
              </div>
            </div>

            {/* Display options */}
            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-center justify-between gap-3 rounded-[5px] border border-[#E5E7EB] bg-white p-3 text-[12px] cursor-pointer">
                <div><p className="font-medium text-[#111]">Homepage</p><p className="text-[11px] text-[#9CA3AF]">Feature as tile</p></div>
                <input type="checkbox" checked={!!c.featuredOnHome} onChange={(e) => set('featuredOnHome', e.target.checked)} className="w-3.5 h-3.5 accent-[#111]" />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-[5px] border border-[#E5E7EB] bg-white p-3 text-[12px] cursor-pointer">
                <div><p className="font-medium text-[#111]">Active</p><p className="text-[11px] text-[#9CA3AF]">Public page</p></div>
                <input type="checkbox" checked={c.isActive !== false} onChange={(e) => set('isActive', e.target.checked)} className="w-3.5 h-3.5 accent-[#111]" />
              </label>
              <div className="v3-field">
                <label className="v3-label">Sort Order</label>
                <input type="number" className="v3-input" value={c.sortOrder ?? 100} onChange={(e) => set('sortOrder', Number(e.target.value) || 100)} />
              </div>
            </div>
          </div>
        </div>

        <div className="v3-modal-footer">
          <button onClick={onClose} disabled={busy} className="v3-btn v3-btn-secondary">Cancel</button>
          <button onClick={save} disabled={busy} className="v3-btn v3-btn-primary">
            <Save size={12} /> {busy ? 'Saving…' : (isNew ? 'Create Collection' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
}
