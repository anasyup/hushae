import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Boxes, Edit3, Eye, EyeOff, ExternalLink, Plus, Save, Search, Sparkles, Trash2, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';
import MediaPicker from '../components/MediaPicker';
import './products-atelier.css';

/* ===========================================================================
 * Collections — ATELIER luxury theme (same .pa-* family as Products and
 * Categories). Curated product groupings: Manual picks or Smart rules.
 * All working features preserved: create/edit modal (basics, MediaPicker
 * banner, smart rules with tag chips, manual product picker, display
 * options), delete, quick hide/show, deep preview links, search + views.
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
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [view, setView] = useState('all'); // all | featured | smart | hidden
  const [editing, setEditing] = useState(null);

  const load = () => {
    setErr('');
    api('/collections/admin/list', { token: auth.token })
      .then((d) => setList(d.collections))
      .catch(() => { setList([]); setErr('Something prevented the collections from loading.'); });
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try { await api(`/collections/${c._id}`, { method: 'DELETE', token: auth.token }); toast(`"${c.name}" deleted`); load(); }
    catch (ex) { toast(ex.message); }
  };
  const toggleActive = async (c) => {
    try {
      await api(`/collections/${c._id}`, { method: 'PUT', token: auth.token, body: { isActive: !(c.isActive !== false) } });
      toast(c.isActive !== false ? `"${c.name}" hidden` : `"${c.name}" is live`);
      load();
    } catch (ex) { toast(ex.message); }
  };

  const summary = useMemo(() => {
    const s = { total: 0, featured: 0, smart: 0, hidden: 0 };
    for (const c of list || []) {
      s.total++;
      if (c.isActive === false) s.hidden++;
      if (c.featuredOnHome) s.featured++;
      if (c.smart?.enabled) s.smart++;
    }
    return s;
  }, [list]);

  const filtered = useMemo(() => {
    let out = Array.isArray(list) ? list : [];
    if (view === 'featured') out = out.filter((c) => c.featuredOnHome);
    if (view === 'smart') out = out.filter((c) => c.smart?.enabled);
    if (view === 'hidden') out = out.filter((c) => c.isActive === false);
    const term = q.trim().toLowerCase();
    if (term) out = out.filter((c) => c.name?.toLowerCase().includes(term) || c.slug?.toLowerCase().includes(term));
    return out;
  }, [list, view, q]);

  const stats = [
    { label: 'All collections', value: summary.total, key: 'all' },
    { label: 'Featured', value: summary.featured, key: 'featured', note: { text: 'Homepage', tone: 'pa-note-green' } },
    { label: 'Smart', value: summary.smart, key: 'smart', note: { text: 'Auto-filled', tone: 'pa-note-blue' } },
    { label: 'Hidden', value: summary.hidden, key: 'hidden', note: { text: 'Not public', tone: 'pa-note-gray' } },
  ];

  return (
    <AdminLayout title="Collections">
      <div className="pa-outer">
        <div className="pa-wrap">

          {/* ── Page head ─────────────────────────────────────────────── */}
          <div className="pa-head">
            <div>
              <h1>Collections</h1>
              <p>Curated groups of products — season, occasion or theme.</p>
            </div>
            <div className="pa-head-actions">
              <button type="button" onClick={() => setEditing({ ...EMPTY_COLLECTION })} className="pa-btn-black">
                <Plus size={12} strokeWidth={2.4} /> New collection
              </button>
            </div>
          </div>

          {/* ── Stats = views ─────────────────────────────────────────── */}
          <div className="pa-stats pa-stats-4">
            {stats.map((m) => (
              <button key={m.key} type="button" onClick={() => setView(m.key)} aria-pressed={view === m.key} className={`pa-stat ${view === m.key ? 'active' : ''}`}>
                <p className="pa-stat-label">{m.label}</p>
                <p className="pa-stat-val">{list === null ? '—' : m.value.toLocaleString()}</p>
                {m.note && <span className={`pa-stat-note ${m.note.tone}`}>{m.note.text}</span>}
              </button>
            ))}
          </div>

          {/* ── Search ────────────────────────────────────────────────── */}
          <div className="pa-card pa-toolbar">
            <div className="pa-search">
              <Search size={13} strokeWidth={2} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search collections by name or slug…"
                aria-label="Search collections"
              />
            </div>
            {(q || view !== 'all') && (
              <button type="button" onClick={() => { setQ(''); setView('all'); }} className="pa-btn-sm" style={{ marginLeft: 'auto' }}>
                Clear
              </button>
            )}
          </div>

          {/* ── States ────────────────────────────────────────────────── */}
          {err && (
            <div className="pa-card pa-state">
              <div className="pa-state-icon"><AlertTriangle size={18} strokeWidth={1.8} /></div>
              <h3>Unable to load collections</h3>
              <p>{err}</p>
              <button type="button" onClick={() => { setList(null); load(); }} className="pa-btn-black">Try again</button>
            </div>
          )}

          {list === null && !err && (
            <div className="pa-card pa-skeleton">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="pa-sk-row" />)}
            </div>
          )}

          {!err && list !== null && filtered.length === 0 && (
            <div className="pa-card pa-state">
              <div className="pa-state-icon"><Boxes size={18} strokeWidth={1.8} /></div>
              <h3>{q || view !== 'all' ? 'No collections match' : 'No collections yet'}</h3>
              <p>{q || view !== 'all' ? 'Nothing matches this search or view. Clear it or try another.' : 'Create your first collection to group products by theme, season or occasion.'}</p>
              {q || view !== 'all'
                ? <button type="button" onClick={() => { setQ(''); setView('all'); }} className="pa-btn-sm">Clear filters</button>
                : <button type="button" onClick={() => setEditing({ ...EMPTY_COLLECTION })} className="pa-btn-black"><Plus size={12} strokeWidth={2.4} /> New collection</button>}
            </div>
          )}

          {/* ── Cards ─────────────────────────────────────────────────── */}
          {!err && filtered.length > 0 && (
            <div className="pa-cards">
              {filtered.map((c, i) => (
                <article key={c._id} className="pa-ccard" style={{ animationDelay: `${Math.min(i * 0.05, 0.35)}s`, opacity: c.isActive === false ? 0.62 : 1 }}>
                  <div className="pa-ccard-img">
                    {c.image
                      ? <img src={c.image} alt={c.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      : <div className="pa-ccard-img-empty"><Boxes size={30} strokeWidth={1.4} /></div>}
                    <div className="pa-ccard-badges">
                      {c.featuredOnHome && <span className="pa-badge pa-b-green"><span className="pa-dot" aria-hidden />Homepage</span>}
                      {c.smart?.enabled && <span className="pa-badge pa-b-blue"><span className="pa-dot" aria-hidden />Smart</span>}
                      {c.isActive === false && <span className="pa-badge pa-b-gray"><span className="pa-dot" aria-hidden />Hidden</span>}
                    </div>
                  </div>
                  <div className="pa-ccard-body">
                    <div className="pa-ccard-top">
                      <div style={{ minWidth: 0 }}>
                        <span className="pa-name" style={{ cursor: 'default' }}>{c.name}</span>
                        <span className="pa-sub" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>/collection/{c.slug}</span>
                      </div>
                      <span className="pa-ccard-count" title={`${c.productCount || 0} products`}>{c.productCount || 0}</span>
                    </div>
                    {c.description && <p className="pa-ccard-desc">{c.description}</p>}
                    <div className="pa-ccard-foot">
                      <a href={`/collection/${c.slug}`} target="_blank" rel="noreferrer" className="pa-preview-link">
                        Preview <ExternalLink size={9} strokeWidth={2.4} style={{ display: 'inline', verticalAlign: '1px' }} />
                      </a>
                      <div className="pa-row-actions">
                        <button type="button" onClick={() => setEditing(c)} className="pa-action-btn" aria-label={`Edit ${c.name}`} title="Edit">
                          <Edit3 size={12} strokeWidth={2} />
                        </button>
                        {c.isActive !== false ? (
                          <button type="button" onClick={() => toggleActive(c)} className="pa-action-btn" aria-label={`Hide ${c.name}`} title="Hide from storefront">
                            <EyeOff size={12} strokeWidth={2} />
                          </button>
                        ) : (
                          <button type="button" onClick={() => toggleActive(c)} className="pa-action-btn" aria-label={`Show ${c.name}`} title="Show on storefront">
                            <Eye size={12} strokeWidth={2} />
                          </button>
                        )}
                        <button type="button" onClick={() => remove(c)} className="pa-action-btn danger" aria-label={`Delete ${c.name}`} title="Delete">
                          <Trash2 size={12} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

        </div>
      </div>

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
 * CollectionEditor — ATELIER modal, create + update (all logic preserved)
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
    const term = productSearch.trim().toLowerCase();
    if (!term) return allProducts.slice(0, 40);
    return allProducts.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      p.categorySlug.toLowerCase().includes(term)
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
    <div className="pa-modal-overlay" onClick={() => !busy && onClose()}>
      <div className="pa-modal wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={isNew ? 'New collection' : 'Edit collection'}>

        {/* ── head ── */}
        <div className="pa-modal-head">
          <div>
            <h3>{isNew ? 'New collection' : 'Edit collection'}</h3>
            <p>{c.name || 'Untitled collection'}{!isNew && c.slug ? ` · /collection/${c.slug}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="pa-action-btn" aria-label="Close">
            <X size={13} strokeWidth={2.2} />
          </button>
        </div>

        <div className="pa-modal-body">

          {/* ── basics ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="pa-field">
            <div>
              <label className="pa-field-label" htmlFor="col-name">Name *</label>
              <input id="col-name" className="pa-modal-input" value={c.name} onChange={(e) => set('name', e.target.value)} placeholder="Wedding Season" autoFocus />
            </div>
            <div>
              <label className="pa-field-label" htmlFor="col-slug">URL slug</label>
              <input id="col-slug" className="pa-modal-input" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }} value={c.slug} onChange={(e) => set('slug', e.target.value)} placeholder="wedding-season (auto if blank)" />
            </div>
          </div>

          <div className="pa-field">
            <label className="pa-field-label" htmlFor="col-desc">Description</label>
            <textarea id="col-desc" className="pa-textarea" value={c.description} onChange={(e) => set('description', e.target.value)} placeholder="Short intro shown on the collection page…" />
          </div>

          <div className="pa-field">
            <p className="pa-field-label">Banner image</p>
            <MediaPicker value={c.image} onChange={(v) => set('image', v)} accept="image" hideUrl />
            <p className="pa-field-hint">Recommended 16:9 landscape.</p>
          </div>

          {/* ── smart rules ── */}
          <div className="pa-rules-box">
            <div className="pa-switch-row" style={{ paddingTop: 0 }}>
              <div>
                <p className="pa-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={12} strokeWidth={2} /> Smart rules
                </p>
                <p className="pa-section-desc">Products matching these rules are added automatically.</p>
              </div>
              <button
                type="button" role="switch" aria-checked={!!c.smart.enabled} aria-label="Smart rules enabled"
                className={`pa-switch ${c.smart.enabled ? 'on' : ''}`}
                onClick={() => setSmart('enabled', !c.smart.enabled)}
              />
            </div>

            {c.smart.enabled && (
              <div style={{ marginTop: 12 }}>
                <p className="pa-field-label">Any of these tags</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', border: '1px solid var(--pa-border-light)', background: '#fff', borderRadius: 8, padding: '7px 9px' }}>
                  {(c.smart.tags || []).map((t, i) => (
                    <span key={t + i} className="pa-tag">
                      {t}
                      <button type="button" onClick={() => setSmart('tags', c.smart.tags.filter((_, j) => j !== i))} aria-label={`Remove tag ${t}`}>×</button>
                    </span>
                  ))}
                  <input
                    className="pa-tag-input"
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>
                  <div>
                    <label className="pa-field-label">Category</label>
                    <select className="pa-select" style={{ width: '100%', maxWidth: 'none' }} value={c.smart.category} onChange={(e) => setSmart('category', e.target.value)}>
                      <option value="">Any</option>
                      {cats.map((k) => <option key={k.slug} value={k.slug}>{k.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="pa-field-label">Tier</label>
                    <select className="pa-select" style={{ width: '100%', maxWidth: 'none' }} value={c.smart.tier} onChange={(e) => setSmart('tier', e.target.value)}>
                      <option value="">Any</option>
                      <option value="Economy">Economy</option>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className="pa-field-label">Gender</label>
                    <select className="pa-select" style={{ width: '100%', maxWidth: 'none' }} value={c.smart.gender} onChange={(e) => setSmart('gender', e.target.value)}>
                      <option value="">Any</option>
                      <option value="women">Women</option>
                      <option value="men">Men</option>
                    </select>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 11.5, color: 'var(--pa-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!c.smart.onSale} onChange={(e) => setSmart('onSale', e.target.checked)} className="pa-input-chk" />
                  Only products currently on sale (compare-at price set)
                </label>
              </div>
            )}
          </div>

          {/* ── manual products ── */}
          <div className="pa-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p className="pa-section-title" style={{ margin: 0 }}>Manual products</p>
              <span style={{ fontSize: 10.5, color: 'var(--pa-muted)', fontWeight: 600 }}>{selectedIds.size} selected</span>
            </div>
            <div className="pa-search" style={{ maxWidth: 'none', marginBottom: 8 }}>
              <Search size={13} strokeWidth={2} />
              <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products by name, SKU or category" aria-label="Search products to add" />
            </div>
            <div className="pa-picker">
              {filteredProducts.map((p) => {
                const on = selectedIds.has(String(p._id));
                return (
                  <button type="button" key={p._id} onClick={() => toggleProduct(p._id)} className={`pa-picker-row ${on ? 'on' : ''}`}>
                    <input type="checkbox" checked={on} readOnly className="pa-input-chk" tabIndex={-1} aria-hidden />
                    <Img src={p.images?.[0]?.url} alt="" />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span className="pa-picker-name">{p.name}</span>
                      <span className="pa-picker-sub">{p.gender} · {p.categorySlug} · {p.sku}</span>
                    </span>
                    <span className="pa-picker-price">{pkr(p.price)}</span>
                  </button>
                );
              })}
              {filteredProducts.length === 0 && <p className="pa-picker-empty">No products match.</p>}
            </div>
          </div>

          {/* ── display options ── */}
          <div className="pa-rules-box" style={{ marginBottom: 0 }}>
            <div className="pa-switch-row" style={{ paddingTop: 0 }}>
              <div>
                <p className="pa-switch-label" style={{ margin: 0 }}>Show on homepage</p>
                <p className="pa-switch-desc" style={{ margin: 0 }}>Feature this collection as a tile</p>
              </div>
              <button
                type="button" role="switch" aria-checked={!!c.featuredOnHome} aria-label="Show on homepage"
                className={`pa-switch ${c.featuredOnHome ? 'on' : ''}`}
                onClick={() => set('featuredOnHome', !c.featuredOnHome)}
              />
            </div>
            <div className="pa-switch-row">
              <div>
                <p className="pa-switch-label" style={{ margin: 0 }}>Active</p>
                <p className="pa-switch-desc" style={{ margin: 0 }}>Public page reachable</p>
              </div>
              <button
                type="button" role="switch" aria-checked={c.isActive !== false} aria-label="Collection active"
                className={`pa-switch ${c.isActive !== false ? 'on' : ''}`}
                onClick={() => set('isActive', !(c.isActive !== false))}
              />
            </div>
            <div style={{ maxWidth: 160 }}>
              <label className="pa-field-label" htmlFor="col-order">Sort order</label>
              <input id="col-order" className="pa-modal-input" type="number" value={c.sortOrder ?? 100} onChange={(e) => set('sortOrder', Number(e.target.value) || 100)} />
            </div>
          </div>
        </div>

        {/* ── foot ── */}
        <div className="pa-modal-foot">
          <p className="pa-modal-note">{selectedIds.size} manual product{selectedIds.size === 1 ? '' : 's'}{c.smart.enabled ? ' + smart rules on' : ''}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} disabled={busy} className="pa-btn-sm">Cancel</button>
            <button type="button" onClick={save} disabled={busy || !c.name.trim()} className="pa-btn-black">
              <Save size={12} strokeWidth={2.2} /> {busy ? 'Saving…' : (isNew ? 'Create collection' : 'Save changes')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
