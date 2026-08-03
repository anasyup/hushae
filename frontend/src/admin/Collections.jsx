import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes, ChevronDown, ChevronUp, Edit3, Eye, EyeOff, Plus, Save, Search, Sparkles,
  Star, Tag, Trash2, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';
import MediaPicker from '../components/MediaPicker';

/*
 * Collections admin — curated product groupings (Wedding, Summer, Bridal…).
 * Two modes per collection:
 *   - Manual: admin picks products
 *   - Smart:  admin defines rules (tags, category, tier, gender, sale, price)
 */

const EMPTY_COLLECTION = {
  name: '', slug: '', description: '', image: '',
  products: [],
  smart: { enabled: false, tags: [], category: '', tier: '', gender: '', onSale: false, minPrice: null, maxPrice: null },
  featuredOnHome: false, sortOrder: 100, isActive: true,
};

export default function Collections() {
  const { auth, toast } = useApp();
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null); // null or a collection doc

  const load = () => api('/collections/admin/list', { token: auth.token }).then((d) => setList(d.collections)).catch(() => setList([]));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try { await api(`/collections/${c._id}`, { method: 'DELETE', token: auth.token }); toast('Deleted'); load(); }
    catch (ex) { toast(ex.message); }
  };

  if (!list) return <AdminLayout title="Collections"><div className="animate-pulse rounded-xl bg-neutral-100 h-64" /></AdminLayout>;

  return (
    <AdminLayout title="Collections">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-neutral-500">
          Curated groups of products — Wedding Season, Summer Essentials, Bridal, etc. Show them on the homepage or link them from the menu.
        </p>
        <button
          onClick={() => setEditing({ ...EMPTY_COLLECTION })}
          className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-neutral-800"
        >
          <Plus size={13} /> New collection
        </button>
      </div>

      {/* Grid of collections */}
      {list.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-neutral-100 text-neutral-500">
            <Boxes size={22} />
          </span>
          <p className="mt-4 text-sm font-medium text-neutral-700">No collections yet</p>
          <p className="mt-1 max-w-xs text-[11px] text-neutral-500">Create your first collection to group products by theme, season or occasion.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <article key={c._id} className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative aspect-[16/9] overflow-hidden bg-neutral-50">
                {c.image
                  ? <img src={c.image} alt={c.name} className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  : <div className="flex h-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200"><Boxes size={32} className="text-neutral-400" /></div>}
                <div className="absolute right-2 top-2 flex gap-1">
                  {c.featuredOnHome && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white"><Star size={9} className="inline" fill="currentColor" /> Featured</span>}
                  {!c.isActive && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700">Hidden</span>}
                  {c.smart?.enabled && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white"><Sparkles size={9} className="inline" /> Smart</span>}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-neutral-900">{c.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-neutral-500">/collection/{c.slug}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-700">{c.productCount || 0}</span>
                </div>
                {c.description && <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-neutral-600">{c.description}</p>}
                <div className="mt-4 flex items-center justify-between">
                  <a href={`/collection/${c.slug}`} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900">Preview →</a>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(c)} className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900" aria-label="Edit"><Edit3 size={13} /></button>
                    <button onClick={() => remove(c)} className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-red-50 hover:text-red-700" aria-label="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Editor modal */}
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

/* ==========================================================================
 * CollectionEditor — modal that handles create + update
 * ======================================================================== */
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
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.categorySlug.toLowerCase().includes(q)
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
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-neutral-900/60 px-4 py-6 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{isNew ? 'New collection' : 'Edit collection'}</p>
            <h2 className="mt-0.5 font-sans text-xl text-neutral-900">{c.name || 'Untitled collection'}</h2>
          </div>
          <button onClick={onClose} disabled={busy} className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"><X size={18} /></button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {/* Basic info */}
          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Name *</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={c.name} onChange={(e) => set('name', e.target.value)} placeholder="Wedding Season" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">URL slug</label>
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 font-mono text-xs" value={c.slug} onChange={(e) => set('slug', e.target.value)} placeholder="wedding-season (auto if blank)" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Description</label>
              <textarea className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 min-h-20" value={c.description} onChange={(e) => set('description', e.target.value)} placeholder="Short intro shown on the collection page…" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Banner image</label>
              <MediaPicker value={c.image} onChange={(v) => set('image', v)} accept="image" hideUrl />
              <p className="mt-1 text-[11px] text-neutral-500">Recommended 16:9 landscape.</p>
            </div>
          </div>

          {/* Smart rules toggle */}
          <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-700">Smart rules</p>
                <p className="mt-0.5 text-[11px] text-neutral-500">Products matching these rules are added automatically.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={!!c.smart.enabled} onChange={(e) => setSmart('enabled', e.target.checked)} />
                <span className="h-6 w-11 rounded-full bg-neutral-300 transition peer-checked:bg-neutral-900 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
              </label>
            </div>
            {c.smart.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Any of these tags</label>
                  <div className="rounded-xl border border-neutral-200 bg-white p-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(c.smart.tags || []).map((t, i) => (
                        <span key={t + i} className="inline-flex items-center gap-1 rounded-full bg-neutral-900 pl-3 pr-1 py-1 text-[11px] font-semibold text-white">
                          {t}
                          <button type="button" onClick={() => setSmart('tags', c.smart.tags.filter((_, j) => j !== i))} className="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30">×</button>
                        </span>
                      ))}
                      <input
                        className="min-w-32 flex-1 bg-transparent px-2 py-1 text-xs outline-none placeholder:text-neutral-400"
                        placeholder="Type a tag and press Enter"
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
                      <datalist id="all-product-tags">
                        {allTags.map((t) => <option key={t} value={t} />)}
                      </datalist>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Category</label>
                    <select className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={c.smart.category} onChange={(e) => setSmart('category', e.target.value)}>
                      <option value="">Any</option>
                      {cats.map((k) => <option key={k.slug} value={k.slug}>{k.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Tier</label>
                    <select className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={c.smart.tier} onChange={(e) => setSmart('tier', e.target.value)}>
                      <option value="">Any</option>
                      <option value="Economy">Economy</option>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Gender</label>
                    <select className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={c.smart.gender} onChange={(e) => setSmart('gender', e.target.value)}>
                      <option value="">Any</option>
                      <option value="women">Women</option>
                      <option value="men">Men</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm">
                  <input type="checkbox" checked={!!c.smart.onSale} onChange={(e) => setSmart('onSale', e.target.checked)} className="h-4 w-4 accent-neutral-900" />
                  Only products currently on sale (compare-at price set)
                </label>
              </div>
            )}
          </div>

          {/* Manual products */}
          <div className="mb-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-700">Manual products</p>
              <span className="text-[11px] text-neutral-500">{selectedIds.size} selected</span>
            </div>
            <div className="mb-2 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 !py-2 !pl-9 !text-[12px]" placeholder="Search products by name, SKU or category" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
              {filteredProducts.map((p) => {
                const on = selectedIds.has(String(p._id));
                return (
                  <button
                    type="button"
                    key={p._id}
                    onClick={() => toggleProduct(p._id)}
                    className={`flex w-full items-center gap-3 border-b border-neutral-100 p-2.5 text-left transition last:border-0 ${on ? 'bg-neutral-900/5' : 'hover:bg-neutral-50'}`}
                  >
                    <input type="checkbox" checked={on} readOnly className="h-4 w-4 accent-neutral-900" />
                    <Img src={p.images?.[0]?.url} alt="" className="h-10 w-8 rounded-md border border-neutral-200 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[12px] font-medium text-neutral-900">{p.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{p.gender} · {p.categorySlug} · {p.sku}</p>
                    </div>
                    <p className="font-sans text-[12px] font-semibold tabular-nums">{pkr(p.price)}</p>
                  </button>
                );
              })}
              {filteredProducts.length === 0 && <p className="p-6 text-center text-[12px] text-neutral-400">No products match.</p>}
            </div>
          </div>

          {/* Display options */}
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-sm">
              <div>
                <p className="font-medium">Show on homepage</p>
                <p className="text-[11px] text-neutral-500">Feature this collection as a tile</p>
              </div>
              <input type="checkbox" checked={!!c.featuredOnHome} onChange={(e) => set('featuredOnHome', e.target.checked)} className="h-4 w-4 accent-neutral-900" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-sm">
              <div>
                <p className="font-medium">Active</p>
                <p className="text-[11px] text-neutral-500">Public page reachable</p>
              </div>
              <input type="checkbox" checked={c.isActive !== false} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 accent-neutral-900" />
            </label>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Sort order</label>
              <input type="number" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 !py-2 !text-[12px]" value={c.sortOrder ?? 100} onChange={(e) => set('sortOrder', Number(e.target.value) || 100)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          <button onClick={onClose} disabled={busy} className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40">Cancel</button>
          <button onClick={save} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-[12px] font-semibold uppercase tracking-widest text-white transition hover:bg-neutral-800 disabled:opacity-50">
            <Save size={13} /> {busy ? 'Saving…' : (isNew ? 'Create collection' : 'Save changes')}
          </button>
        </div>
      </div>
    </div>
  );
}
