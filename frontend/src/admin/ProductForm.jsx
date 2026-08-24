import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckIcon, EyeOff, Save, Trash2, Package, Image, DollarSign, Layers, Ruler, Factory, Warehouse, FolderOpen, FileText, Search, Globe, ChevronRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import ImageTiles from '../components/ImageTiles';

/* ============================================================================
 * PRODUCT EDITOR V3 — Phase 11
 * Persistent section navigation for comprehensive product management.
 * ========================================================================== */

const BADGE_POOL = ['Breathable', 'Cooling', 'Seamless', 'Sweat Control', 'Support', 'Quick Dry', '4-Way Stretch', 'Tag-Free', 'Silk-Touch', 'Value Pack'];

const SECTIONS = [
  { id: 'basic', label: 'Basic', icon: Package },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'variants', label: 'Variants', icon: Layers },
  { id: 'inventory', label: 'Inventory', icon: Warehouse },
  { id: 'organization', label: 'Organization', icon: FolderOpen },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'publishing', label: 'Publishing', icon: Globe },
];

const EMPTY = {
  name: '', sku: '', gender: 'women', categorySlug: '', category: '',
  tier: 'Standard', price: '', compareAtPrice: '', costPrice: '',
  onSale: false, saleStart: '', saleEnd: '',
  stock: 25, images: [], video: '', shortDescription: '', description: '',
  barcode: '', weightGrams: '', reorderPoint: 10, safetyStock: 3, variants: [],
  sizesText: '', fabric: '', colors: [{ name: 'Black', hex: '#1A1A1A' }],
  badges: [], tags: [], careText: '',
  isFeatured: false, isBestSeller: false, isActive: true, status: 'active', bundleSlug: '',
};

const toLocalInput = (iso) => (iso ? String(iso).slice(0, 16) : '');

export default function ProductForm() {
  const { id } = useParams();
  const isNew = id === 'new';
  const { auth, toast } = useApp();
  const nav = useNavigate();
  const [cats, setCats] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [dirty, setDirty] = useState(false);

  useEffect(() => { api('/categories?all=1').then((d) => setCats(d.categories)).catch(() => {}); }, []);
  useEffect(() => {
    if (isNew) return;
    api(`/products/admin/list?ids=${id}`, { token: auth.token })
      .then((d) => {
        const p = d.products[0];
        if (!p) throw new Error();
        const imgs = p.images.map((i) => i.url);
        if (p.video && !imgs.includes(p.video)) imgs.push(p.video);
        setF({
          ...EMPTY, ...p, price: String(p.price), compareAtPrice: p.compareAtPrice || '',
          costPrice: p.costPrice || '',
          onSale: p.onSale === true, saleStart: toLocalInput(p.saleStart), saleEnd: toLocalInput(p.saleEnd),
          images: imgs, video: '',
          sizesText: p.sizes.join(', '), careText: p.care.join('\n'),
          barcode: p.barcode || '', weightGrams: p.weightGrams || '',
          reorderPoint: p.reorderPoint ?? 10, safetyStock: p.safetyStock ?? 3,
          variants: Array.isArray(p.variants) ? p.variants : [],
        });
      })
      .catch(() => { toast('Product not found'); nav('/admin/products'); });
  }, [id]); // eslint-disable-line

  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setDirty(true); };
  const catOpts = cats.filter((c) => c.gender === f.gender);

  const save = async (e, forceStatus) => {
    if (e) e.preventDefault();
    const images = f.images.filter(Boolean).map((url, i) => ({ url, alt: `${f.name} — view ${i + 1}` }));
    if (images.length < 4) { toast('Add at least 4 images'); return; }
    const cat = cats.find((c) => c.slug === f.categorySlug);
    const onSale = f.onSale === true;
    const saleStart = onSale && f.saleStart ? new Date(f.saleStart).toISOString() : null;
    const saleEnd = onSale && f.saleEnd ? new Date(f.saleEnd).toISOString() : null;
    const body = {
      name: f.name, sku: f.sku || `HS-${Date.now().toString(36).toUpperCase()}`, gender: f.gender,
      tier: f.tier, price: Number(f.price),
      compareAtPrice: onSale ? (f.compareAtPrice ? Number(f.compareAtPrice) : null) : null,
      onSale, saleStart, saleEnd,
      costPrice: f.costPrice ? Number(f.costPrice) : 0,
      stock: Number(f.stock) || 0, images, video: '', shortDescription: f.shortDescription, description: f.description,
      sizes: f.sizesText.split(',').map((s) => s.trim()).filter(Boolean),
      colors: f.colors.filter((c) => c.name && c.hex),
      fabric: f.fabric, badges: f.badges, tags: (f.tags || []).map((t) => String(t).toLowerCase().trim()).filter(Boolean),
      care: f.careText.split('\n').map((s) => s.trim()).filter(Boolean),
      isFeatured: f.isFeatured, isBestSeller: f.isBestSeller, isActive: f.isActive,
      status: forceStatus || f.status || 'active',
      category: cat?._id || f.category || undefined, categorySlug: f.categorySlug || cat?.slug, bundleSlug: f.bundleSlug,
      barcode: f.barcode || '', weightGrams: Number(f.weightGrams) || 0,
      reorderPoint: Number(f.reorderPoint) || 0, safetyStock: Number(f.safetyStock) || 0,
      variants: (f.variants || []).map((v) => ({
        key: v.key || `${v.size || ''}|${v.color || ''}`,
        sku: v.sku || '', barcode: v.barcode || '', size: v.size || '', color: v.color || '',
        price: v.price === '' || v.price == null ? null : Number(v.price),
        compareAtPrice: v.compareAtPrice === '' || v.compareAtPrice == null ? null : Number(v.compareAtPrice),
        costPrice: v.costPrice === '' || v.costPrice == null ? null : Number(v.costPrice),
        stock: Number(v.stock) || 0, weightGrams: Number(v.weightGrams) || 0,
        image: v.image || '', active: v.active !== false,
      })),
    };
    if (!body.category) { toast('Choose a category'); setActiveSection('organization'); return; }
    setBusy(true);
    try {
      if (isNew) await api('/products', { method: 'POST', token: auth.token, body });
      else await api(`/products/${id}`, { method: 'PUT', token: auth.token, body });
      toast(isNew ? 'Product created' : 'Product saved');
      setDirty(false);
      nav('/admin/products');
    } catch (ex) { toast(ex.message); }
    setBusy(false);
  };

  const profit = Number(f.price || 0) - Number(f.costPrice || 0);
  const margin = Number(f.price) > 0 ? (profit / Number(f.price)) * 100 : 0;

  return (
    <AdminLayout title={isNew ? 'New Product' : (f.name || 'Edit Product')}>
      {/* Header */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb">
            <Link to="/admin">Home</Link><span>/</span>
            <Link to="/admin/products">Products</Link><span>/</span>
            <span>{isNew ? 'New Product' : f.name || 'Edit'}</span>
          </div>
          <h1 className="v3-h-page">{isNew ? 'New Product' : (f.name || 'Edit Product')}</h1>
        </div>
        <div className="v3-page-header-right">
          <Link to="/admin/products" className="v3-btn v3-btn-secondary v3-btn-sm"><ArrowLeft size={12} /> Back</Link>
          <button onClick={(e) => save(e, 'draft')} disabled={busy} className="v3-btn v3-btn-secondary v3-btn-sm">
            <EyeOff size={12} /> Save Draft
          </button>
          <button onClick={save} disabled={busy} className="v3-btn v3-btn-primary">
            <Save size={12} /> {busy ? 'Saving…' : isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Section Navigation */}
        <div className="hidden lg:block w-48 flex-shrink-0">
          <nav className="sticky top-16 space-y-0.5">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-[5px] text-[12px] font-medium transition-colors text-left ${activeSection === s.id ? 'bg-[#EDEEF0] text-[#111]' : 'text-[#6B7280] hover:bg-[#F5F6F8] hover:text-[#111]'}`}>
                <s.icon size={14} className={activeSection === s.id ? 'text-[#111]' : 'text-[#9CA3AF]'} />
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Mobile section selector */}
          <div className="lg:hidden">
            <select value={activeSection} onChange={e => setActiveSection(e.target.value)} className="v3-select w-full">
              {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {/* ── BASIC ─────────────────────────────────────────────────── */}
          {activeSection === 'basic' && (
            <div className="v3-card">
              <div className="v3-card-header"><span className="v3-h-section">Basic Information</span></div>
              <div className="v3-card-body space-y-4">
                <div className="v3-field">
                  <label className="v3-label">Title *</label>
                  <input className="v3-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Product name" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="v3-field">
                    <label className="v3-label">SKU</label>
                    <input className="v3-input" value={f.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Auto-generated if empty" />
                  </div>
                  <div className="v3-field">
                    <label className="v3-label">Barcode</label>
                    <input className="v3-input" value={f.barcode} onChange={(e) => set('barcode', e.target.value)} />
                  </div>
                </div>
                <div className="v3-field">
                  <label className="v3-label">Short Description</label>
                  <input className="v3-input" value={f.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="One line for product cards" />
                </div>
                <div className="v3-field">
                  <label className="v3-label">Description</label>
                  <textarea className="v3-textarea" rows={5} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Detailed product description…" />
                </div>
              </div>
            </div>
          )}

          {/* ── MEDIA ─────────────────────────────────────────────────── */}
          {activeSection === 'media' && (
            <div className="v3-card">
              <div className="v3-card-header"><span className="v3-h-section">Media</span></div>
              <div className="v3-card-body">
                <ImageTiles images={f.images} onChange={(arr) => set('images', arr)} />
                <p className="v3-field-hint mt-3">Minimum 4 images recommended. Drag to reorder.</p>
              </div>
            </div>
          )}

          {/* ── PRICING ───────────────────────────────────────────────── */}
          {activeSection === 'pricing' && (
            <div className="v3-card">
              <div className="v3-card-header"><span className="v3-h-section">Pricing</span></div>
              <div className="v3-card-body space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="v3-field">
                    <label className="v3-label">Price (PKR) *</label>
                    <input className="v3-input" type="number" min="0" value={f.price} onChange={(e) => set('price', e.target.value)} required />
                  </div>
                  <div className="v3-field">
                    <label className="v3-label">Compare-at Price</label>
                    <input className="v3-input" type="number" min="0" value={f.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} placeholder="Original price" />
                  </div>
                  <div className="v3-field">
                    <label className="v3-label">Cost / Wholesale</label>
                    <input className="v3-input" type="number" min="0" value={f.costPrice} onChange={(e) => set('costPrice', e.target.value)} placeholder="Your cost" />
                  </div>
                </div>
                {Number(f.price) > 0 && Number(f.costPrice) > 0 && (
                  <div className="v3-card-flat grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="v3-h-label">Profit per unit</div>
                      <div className="text-[16px] font-semibold v3-tabular mt-1">{pkr(profit)}</div>
                    </div>
                    <div>
                      <div className="v3-h-label">Margin</div>
                      <div className="text-[16px] font-semibold v3-tabular mt-1">{margin.toFixed(1)}%</div>
                    </div>
                  </div>
                )}
                <div className="border-t border-[#F0F1F3] pt-4">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={f.onSale} onChange={(e) => { set('onSale', e.target.checked); if (!e.target.checked) { set('saleStart', ''); set('saleEnd', ''); set('compareAtPrice', ''); } }} className="w-4 h-4 accent-[#111]" />
                    <span className="text-[13px] text-[#111] font-medium">On sale</span>
                  </label>
                  {f.onSale && (
                    <div className="grid gap-4 sm:grid-cols-2 mt-3">
                      <div className="v3-field"><label className="v3-label">Sale starts</label><input type="datetime-local" className="v3-input" value={f.saleStart} onChange={(e) => set('saleStart', e.target.value)} /></div>
                      <div className="v3-field"><label className="v3-label">Sale ends</label><input type="datetime-local" className="v3-input" value={f.saleEnd} onChange={(e) => set('saleEnd', e.target.value)} /></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── VARIANTS ──────────────────────────────────────────────── */}
          {activeSection === 'variants' && (
            <div className="v3-card">
              <div className="v3-card-header"><span className="v3-h-section">Variants</span></div>
              <div className="v3-card-body space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="v3-field">
                    <label className="v3-label">Sizes</label>
                    <input className="v3-input" value={f.sizesText} onChange={(e) => set('sizesText', e.target.value)} placeholder="S, M, L, XL" />
                    <p className="v3-field-hint">Comma separated</p>
                  </div>
                  <div className="v3-field">
                    <label className="v3-label">Fabric</label>
                    <input className="v3-input" value={f.fabric} onChange={(e) => set('fabric', e.target.value)} placeholder="92% cotton, 8% elastane" />
                  </div>
                </div>
                <div className="v3-field">
                  <label className="v3-label">Colors</label>
                  <div className="space-y-2">
                    {f.colors.map((c, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <input type="color" value={c.hex} onChange={(e) => set('colors', f.colors.map((x, j) => j === i ? { ...x, hex: e.target.value } : x))} className="w-10 h-8 rounded-[3px] border border-[#E5E7EB] cursor-pointer" />
                        <input className="v3-input flex-1" value={c.name} onChange={(e) => set('colors', f.colors.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Color name" />
                        {f.colors.length > 1 && <button onClick={() => set('colors', f.colors.filter((_, j) => j !== i))} className="v3-btn v3-btn-icon v3-btn-ghost sm"><Trash2 size={12} /></button>}
                      </div>
                    ))}
                    <button onClick={() => set('colors', [...f.colors, { name: '', hex: '#69625F' }])} className="text-[11px] font-medium text-[#6B7280] hover:text-[#111]">+ Add color</button>
                  </div>
                </div>
                <div className="v3-field">
                  <label className="v3-label">Weight (grams)</label>
                  <input className="v3-input" type="number" min="0" value={f.weightGrams} onChange={(e) => set('weightGrams', e.target.value)} style={{ maxWidth: 200 }} />
                </div>
              </div>
            </div>
          )}

          {/* ── INVENTORY ─────────────────────────────────────────────── */}
          {activeSection === 'inventory' && (
            <div className="v3-card">
              <div className="v3-card-header"><span className="v3-h-section">Inventory</span></div>
              <div className="v3-card-body">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="v3-field"><label className="v3-label">Stock</label><input className="v3-input" type="number" min="0" value={f.stock} onChange={(e) => set('stock', e.target.value)} /></div>
                  <div className="v3-field"><label className="v3-label">Reorder Point</label><input className="v3-input" type="number" min="0" value={f.reorderPoint} onChange={(e) => set('reorderPoint', e.target.value)} /></div>
                  <div className="v3-field"><label className="v3-label">Safety Stock</label><input className="v3-input" type="number" min="0" value={f.safetyStock} onChange={(e) => set('safetyStock', e.target.value)} /></div>
                </div>
              </div>
            </div>
          )}

          {/* ── ORGANIZATION ──────────────────────────────────────────── */}
          {activeSection === 'organization' && (
            <div className="v3-card">
              <div className="v3-card-header"><span className="v3-h-section">Organization</span></div>
              <div className="v3-card-body space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="v3-field">
                    <label className="v3-label">Gender</label>
                    <select className="v3-select w-full" value={f.gender} onChange={(e) => set('gender', e.target.value)}>
                      <option value="women">Women</option><option value="men">Men</option>
                    </select>
                  </div>
                  <div className="v3-field">
                    <label className="v3-label">Category *</label>
                    <select className="v3-select w-full" required value={f.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}>
                      <option value="">Choose category…</option>
                      {catOpts.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="v3-field">
                    <label className="v3-label">Tier</label>
                    <select className="v3-select w-full" value={f.tier} onChange={(e) => set('tier', e.target.value)}>
                      {['Economy', 'Standard', 'Premium'].map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="v3-field">
                  <label className="v3-label">Tags</label>
                  <div className="flex flex-wrap gap-1.5 border border-[#E5E7EB] rounded-[5px] p-2 min-h-[36px]">
                    {(f.tags || []).map((t, i) => (
                      <span key={t + i} className="inline-flex items-center gap-1 bg-[#111] text-white rounded-[3px] px-2 py-0.5 text-[11px]">
                        {t}
                        <button onClick={() => set('tags', (f.tags || []).filter((_, j) => j !== i))} className="hover:opacity-60">×</button>
                      </span>
                    ))}
                    <input className="flex-1 min-w-[100px] bg-transparent text-[13px] outline-none" placeholder="Add tag + Enter" onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const v = e.currentTarget.value.trim().toLowerCase(); if (v && !(f.tags || []).includes(v)) set('tags', [...(f.tags || []), v]); e.currentTarget.value = ''; }
                      else if (e.key === 'Backspace' && !e.currentTarget.value && (f.tags || []).length) set('tags', (f.tags || []).slice(0, -1));
                    }} />
                  </div>
                </div>
                <div className="v3-field">
                  <label className="v3-label">Badges</label>
                  <div className="flex flex-wrap gap-2">
                    {BADGE_POOL.map((b) => {
                      const active = f.badges.includes(b);
                      return (
                        <button key={b} onClick={() => set('badges', active ? f.badges.filter((x) => x !== b) : [...f.badges, b])}
                          className={`px-3 py-1.5 text-[11px] font-medium rounded-[3px] transition-colors ${active ? 'bg-[#111] text-white' : 'border border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB]'}`}>
                          {active && <CheckIcon size={10} className="inline mr-1" />}{b}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CONTENT ───────────────────────────────────────────────── */}
          {activeSection === 'content' && (
            <div className="v3-card">
              <div className="v3-card-header"><span className="v3-h-section">Content</span></div>
              <div className="v3-card-body">
                <div className="v3-field">
                  <label className="v3-label">Care Instructions</label>
                  <textarea className="v3-textarea" rows={4} value={f.careText} onChange={(e) => set('careText', e.target.value)} placeholder={'Machine wash cold\nDo not bleach\nTumble dry low'} />
                  <p className="v3-field-hint">One instruction per line</p>
                </div>
              </div>
            </div>
          )}

          {/* ── SEO ───────────────────────────────────────────────────── */}
          {activeSection === 'seo' && (
            <div className="v3-card">
              <div className="v3-card-header"><span className="v3-h-section">SEO</span></div>
              <div className="v3-card-body">
                <div className="v3-card-flat text-[12px] text-[#6B7280]">
                  SEO metadata is automatically generated from product title, description, and category. The storefront uses structured data for search engines.
                </div>
              </div>
            </div>
          )}

          {/* ── PUBLISHING ────────────────────────────────────────────── */}
          {activeSection === 'publishing' && (
            <div className="v3-card">
              <div className="v3-card-header"><span className="v3-h-section">Publishing</span></div>
              <div className="v3-card-body space-y-4">
                <div className="v3-field">
                  <label className="v3-label">Status</label>
                  <select className="v3-select w-full" value={f.status || 'active'} onChange={(e) => set('status', e.target.value)} style={{ maxWidth: 300 }}>
                    <option value="active">Active — live in store</option>
                    <option value="draft">Draft — hidden, work in progress</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={f.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="w-4 h-4 accent-[#111]" />
                    <span className="text-[13px]">Featured in signature edit</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={f.isBestSeller} onChange={(e) => set('isBestSeller', e.target.checked)} className="w-4 h-4 accent-[#111]" />
                    <span className="text-[13px]">Mark as best seller</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save bar for unsaved changes */}
      {dirty && (
        <div className="v3-save-bar">
          <span className="v3-save-bar-text">You have unsaved changes</span>
          <div className="v3-save-bar-actions">
            <button onClick={() => setDirty(false)} className="v3-btn v3-btn-ghost v3-btn-sm">Discard</button>
            <button onClick={save} disabled={busy} className="v3-btn v3-btn-primary v3-btn-sm">
              <Save size={12} /> {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
