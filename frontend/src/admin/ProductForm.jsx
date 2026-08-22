import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckIcon, EyeOff, Save, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import ImageTiles from '../components/ImageTiles';
import { btnGhost, btnSolid, ctl } from './orders/orderUi';

/* ===========================================================================
 * PRODUCT FORM — Phase 05 editorial editor. Save payload unchanged.
 * ========================================================================== */

const BADGE_POOL = ['Breathable', 'Cooling', 'Seamless', 'Sweat Control', 'Support', 'Quick Dry', '4-Way Stretch', 'Tag-Free', 'Silk-Touch', 'Value Pack'];

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

function Field({ label, hint, children }) {
  return (
    <div>
      {label && <label className="adm-label mb-1.5 block">{label}</label>}
      {children}
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-white/30">{hint}</p>}
    </div>
  );
}

function Check({ k, label, f, set }) {
  return (
    <label className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-[13px] text-white/75">
      <input type="checkbox" checked={!!f[k]} onChange={(e) => set(k, e.target.checked)} className="h-3.5 w-3.5 rounded-none accent-white" />
      {label}
    </label>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const isNew = id === 'new';
  const { auth, toast } = useApp();
  const nav = useNavigate();
  const [cats, setCats] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

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

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const catOpts = cats.filter((c) => c.gender === f.gender);

  const save = async (e, forceStatus) => {
    e.preventDefault();
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
    if (!body.category) { toast('Choose a category'); return; }
    setBusy(true);
    try {
      if (isNew) await api('/products', { method: 'POST', token: auth.token, body });
      else await api(`/products/${id}`, { method: 'PUT', token: auth.token, body });
      toast(isNew ? 'Product created' : 'Product saved');
      nav('/admin/products');
    } catch (ex) { toast(ex.message); setBusy(false); }
  };

  const profit = Number(f.price || 0) - Number(f.costPrice || 0);
  const margin = Number(f.price) > 0 ? (profit / Number(f.price)) * 100 : 0;

  return (
    <AdminLayout title={isNew ? 'Add Product' : 'Edit Product'}>
      <PageHeader
        title={isNew ? 'New product' : (f.name || 'Edit product')}
        description={isNew ? 'Create a catalog item.' : 'Edit media, commerce and publishing.'}
        actions={(
          <>
            <Link to="/admin/products" className={btnGhost}><ArrowLeft size={12} /> Back</Link>
            <button type="button" disabled={busy} onClick={(e) => save(e, 'draft')} className={btnGhost}>
              <EyeOff size={12} /> Save draft
            </button>
            <button type="button" disabled={busy} onClick={save} className={btnSolid}>
              <Save size={12} /> {busy ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
            </button>
          </>
        )}
      />

      <form onSubmit={save} className="space-y-12">
        <section>
          <p className="adm-index">Product</p>
          <div className="space-y-5 border-y border-white/10 py-6">
            <Field label="Title *">
              <input className={ctl} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Aura Seamless Wireless Bra" required />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="SKU" hint="Auto-generated if left empty">
                <input className={ctl} value={f.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Auto" />
              </Field>
              <Field label="Barcode">
                <input className={ctl} value={f.barcode} onChange={(e) => set('barcode', e.target.value)} />
              </Field>
            </div>
            <Field label="Short description" hint="One line shown on cards and listings">
              <input className={ctl} value={f.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="Second-skin comfort with invisible support" />
            </Field>
            <Field label="Description">
              <textarea className={`${ctl} min-h-[120px] !h-auto py-3`} value={f.description} onChange={(e) => set('description', e.target.value)} rows={5} placeholder="Describe your product in detail..." />
            </Field>
          </div>
        </section>

        <section>
          <p className="adm-index">Media</p>
          <div className="border-y border-white/10 py-6">
            <ImageTiles images={f.images} onChange={(arr) => set('images', arr)} />
          </div>
        </section>

        <section>
          <p className="adm-index">Commerce</p>
          <div className="grid gap-5 border-y border-white/10 py-6 md:grid-cols-3">
            <Field label="Price (PKR) *">
              <input className={ctl} type="number" min="0" required value={f.price} onChange={(e) => set('price', e.target.value)} />
            </Field>
            <Field label="Compare-at">
              <input className={ctl} type="number" min="0" value={f.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} placeholder="e.g. 1550" disabled={!f.onSale} />
            </Field>
            <Field label="Cost / wholesale">
              <input className={ctl} type="number" min="0" value={f.costPrice} onChange={(e) => set('costPrice', e.target.value)} placeholder="e.g. 800" />
            </Field>
          </div>
          {Number(f.price) > 0 && Number(f.costPrice) > 0 && (
            <p className="mt-3 text-[12px] text-white/40">
              Profit per unit <span className="text-white">{pkr(profit)}</span>
              <span className="ml-3 text-white/50">{margin.toFixed(1)}%</span>
            </p>
          )}
        </section>

        <section>
          <p className="adm-index">Variants</p>
          <div className="space-y-5 border-y border-white/10 py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Sizes" hint="Comma separated — e.g. S, M, L, XL">
                <input className={ctl} value={f.sizesText} onChange={(e) => set('sizesText', e.target.value)} placeholder="S, M, L, XL" />
              </Field>
              <Field label="Fabric">
                <input className={ctl} value={f.fabric} onChange={(e) => set('fabric', e.target.value)} placeholder="92% combed cotton, 8% elastane" />
              </Field>
            </div>
            <Field label="Colours">
              <div className="space-y-2">
                {f.colors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <input type="color" value={c.hex} onChange={(e) => set('colors', f.colors.map((x, j) => j === i ? { ...x, hex: e.target.value } : x))} className="h-8 w-10 cursor-pointer border border-white/20 bg-transparent p-0.5" />
                    <input className={ctl} value={c.name} onChange={(e) => set('colors', f.colors.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Colour name" />
                    {f.colors.length > 1 && (
                      <button type="button" onClick={() => set('colors', f.colors.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center text-white/35 hover:text-white" aria-label="Remove colour"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => set('colors', [...f.colors, { name: '', hex: '#69625F' }])} className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/40 hover:text-white">
                  + Add colour
                </button>
              </div>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Weight (grams)">
                <input className={ctl} type="number" min="0" value={f.weightGrams} onChange={(e) => set('weightGrams', e.target.value)} />
              </Field>
              <div className="flex items-end">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => {
                    const sizes = f.sizesText.split(',').map((s) => s.trim()).filter(Boolean);
                    const colors = f.colors.filter((c) => c.name);
                    const rows = [];
                    (sizes.length ? sizes : ['']).forEach((size) => {
                      (colors.length ? colors : [{ name: '' }]).forEach((c) => {
                        const key = `${size}|${c.name}`;
                        const prev = (f.variants || []).find((v) => v.key === key || (v.size === size && v.color === c.name));
                        rows.push(prev || { key, sku: '', barcode: '', size, color: c.name, price: '', stock: f.stock, costPrice: '', active: true });
                      });
                    });
                    set('variants', rows);
                  }}
                >
                  Build from sizes × colours
                </button>
              </div>
            </div>
            {(f.variants || []).length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['Size', 'Colour', 'SKU', 'Barcode', 'Price', 'Stock'].map((h) => (
                        <th key={h} className="adm-label py-2 pr-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {f.variants.map((v, i) => (
                      <tr key={v.key || i} className="border-b border-white/5">
                        <td className="py-2 pr-3 text-white/70">{v.size || '—'}</td>
                        <td className="pr-3 text-white/70">{v.color || '—'}</td>
                        <td className="pr-2 py-1.5"><input className={`${ctl} !h-7`} value={v.sku || ''} onChange={(e) => set('variants', f.variants.map((x, j) => j === i ? { ...x, sku: e.target.value } : x))} /></td>
                        <td className="pr-2"><input className={`${ctl} !h-7`} value={v.barcode || ''} onChange={(e) => set('variants', f.variants.map((x, j) => j === i ? { ...x, barcode: e.target.value } : x))} /></td>
                        <td className="pr-2"><input className={`${ctl} !h-7`} type="number" value={v.price ?? ''} onChange={(e) => set('variants', f.variants.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} /></td>
                        <td><input className={`${ctl} !h-7`} type="number" value={v.stock ?? 0} onChange={(e) => set('variants', f.variants.map((x, j) => j === i ? { ...x, stock: e.target.value } : x))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section>
          <p className="adm-index">Inventory</p>
          <div className="grid gap-5 border-y border-white/10 py-6 md:grid-cols-3">
            <Field label="Stock">
              <input className={ctl} type="number" min="0" value={f.stock} onChange={(e) => set('stock', e.target.value)} />
            </Field>
            <Field label="Reorder point">
              <input className={ctl} type="number" min="0" value={f.reorderPoint} onChange={(e) => set('reorderPoint', e.target.value)} />
            </Field>
            <Field label="Safety stock">
              <input className={ctl} type="number" min="0" value={f.safetyStock} onChange={(e) => set('safetyStock', e.target.value)} />
            </Field>
          </div>
        </section>

        <section>
          <p className="adm-index">Organization</p>
          <div className="grid gap-5 border-y border-white/10 py-6 md:grid-cols-3">
            <Field label="Gender">
              <select className={ctl} value={f.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="women">Women</option><option value="men">Men</option>
              </select>
            </Field>
            <Field label="Category *">
              <select className={ctl} required value={f.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}>
                <option value="">Choose category…</option>
                {catOpts.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Tier">
              <select className={ctl} value={f.tier} onChange={(e) => set('tier', e.target.value)}>
                {['Economy', 'Standard', 'Premium'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-5">
            <Field label="Tags" hint="Used for filters and smart collections">
              <div className="flex flex-wrap gap-1.5 border border-white/20 px-2 py-2">
                {(f.tags || []).map((t, i) => (
                  <span key={t + i} className="inline-flex items-center gap-1 bg-white py-0.5 pl-2.5 pr-1 text-[11px] font-medium uppercase tracking-[0.08em] text-black">
                    {t}
                    <button type="button" onClick={() => set('tags', (f.tags || []).filter((_, j) => j !== i))} className="grid h-4 w-4 place-items-center hover:opacity-60">×</button>
                  </span>
                ))}
                <input className="min-w-[120px] flex-1 bg-transparent px-2 py-1 text-[13px] text-white outline-none placeholder:text-white/30" placeholder="Add tag + Enter" onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const v = e.currentTarget.value.trim().toLowerCase(); if (v && !(f.tags || []).includes(v)) set('tags', [...(f.tags || []), v]); e.currentTarget.value = ''; }
                  else if (e.key === 'Backspace' && !e.currentTarget.value && (f.tags || []).length) set('tags', (f.tags || []).slice(0, -1));
                }} />
              </div>
            </Field>
          </div>
          <div className="mt-5">
            <p className="adm-label mb-3">Badges</p>
            <div className="flex flex-wrap gap-2">
              {BADGE_POOL.map((b) => {
                const active = f.badges.includes(b);
                return (
                  <button type="button" key={b} onClick={() => set('badges', active ? f.badges.filter((x) => x !== b) : [...f.badges, b])}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] ${active ? 'bg-white text-black' : 'border border-white/20 text-white/50 hover:text-white'}`}>
                    {active && <CheckIcon size={11} />}{b}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <p className="adm-index">Content</p>
          <div className="border-y border-white/10 py-6">
            <Field label="Care instructions" hint="One per line">
              <textarea className={`${ctl} min-h-[88px] !h-auto py-3`} value={f.careText} onChange={(e) => set('careText', e.target.value)} rows={3} placeholder={'Machine wash cold\nDo not bleach\nTumble dry low'} />
            </Field>
          </div>
        </section>

        <section>
          <p className="adm-index">Publishing</p>
          <div className="space-y-5 border-y border-white/10 py-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Status">
                <select className={ctl} value={f.status || 'active'} onChange={(e) => set('status', e.target.value)}>
                  <option value="active">Active — live in store</option>
                  <option value="draft">Draft — hidden, work in progress</option>
                </select>
              </Field>
              <div className="flex flex-col justify-end">
                <Check k="isFeatured" label="Featured in signature edit" f={f} set={set} />
                <Check k="isBestSeller" label="Mark as best seller" f={f} set={set} />
              </div>
            </div>

            <div className="border-t border-white/10 pt-5">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={f.onSale === true}
                  onChange={(e) => {
                    const on = e.target.checked;
                    set('onSale', on);
                    if (!on) { set('saleStart', ''); set('saleEnd', ''); set('compareAtPrice', ''); }
                  }}
                  className="h-3.5 w-3.5 rounded-none accent-white"
                />
                <span className="text-[13px] text-white">On sale — appears in /sale, shows % off</span>
              </label>
              {!f.onSale ? (
                <p className="mt-2 text-[12px] text-white/35">Off by default — new products are never automatically discounted.</p>
              ) : (
                <>
                  {f.compareAtPrice && Number(f.compareAtPrice) > 0 && Number(f.price) > 0 && Number(f.compareAtPrice) <= Number(f.price) && (
                    <p className="mt-2 text-[12px] text-white/70">Was price must be higher than the selling price — otherwise there is no real discount.</p>
                  )}
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Sale starts">
                      <input type="datetime-local" className={ctl} value={f.saleStart} onChange={(e) => set('saleStart', e.target.value)} />
                    </Field>
                    <Field label="Sale ends">
                      <input type="datetime-local" className={ctl} value={f.saleEnd} onChange={(e) => set('saleEnd', e.target.value)} />
                    </Field>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-2 pb-8">
          <button type="button" disabled={busy} onClick={(e) => save(e, 'draft')} className={btnGhost}>
            <EyeOff size={12} /> Save as draft
          </button>
          <button disabled={busy} className={btnSolid}>
            <Save size={12} /> {busy ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
