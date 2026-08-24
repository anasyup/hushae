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

/* ============================================================================
 * PRODUCT FORM — Phase 5 Premium Product Editor
 * Sectioned luxury form. White + Jet Black.
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
      {label && <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{label}</label>}
      {children}
      {hint && <p className="mt-1.5 text-[12px] leading-relaxed text-[#AAAAAA]">{hint}</p>}
    </div>
  );
}

function Check({ k, label, f, set }) {
  return (
    <label className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-[13px] text-[#555555]">
      <input type="checkbox" checked={!!f[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 rounded-sm accent-black" />
      {label}
    </label>
  );
}

/* ── Section wrapper ─────────────────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <section className="rounded-md border border-[#EAEAEA] bg-white">
      <div className="border-b border-[#EAEAEA] px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">{title}</p>
      </div>
      <div className="p-6">{children}</div>
    </section>
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
        title={isNew ? 'New Product' : (f.name || 'Edit Product')}
        description={isNew ? 'Create a new catalog item.' : 'Edit media, commerce and publishing details.'}
        actions={(
          <>
            <Link to="/admin/products" className={btnGhost}><ArrowLeft size={12} /> Back</Link>
            <button type="button" disabled={busy} onClick={(e) => save(e, 'draft')} className={btnGhost}>
              <EyeOff size={12} /> Save Draft
            </button>
            <button type="button" disabled={busy} onClick={save} className={btnSolid}>
              <Save size={12} /> {busy ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
            </button>
          </>
        )}
      />

      <form onSubmit={save} className="space-y-6">
        {/* ── Basic Information ─────────────────────────────────────── */}
        <Section title="Basic Information">
          <div className="space-y-5">
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
            <Field label="Short Description" hint="One line shown on cards and listings">
              <input className={ctl} value={f.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="Second-skin comfort with invisible support" />
            </Field>
            <Field label="Description">
              <textarea className={`${ctl} min-h-[120px] !h-auto py-3`} value={f.description} onChange={(e) => set('description', e.target.value)} rows={5} placeholder="Describe your product in detail..." />
            </Field>
          </div>
        </Section>

        {/* ── Media ─────────────────────────────────────────────────── */}
        <Section title="Media">
          <ImageTiles images={f.images} onChange={(arr) => set('images', arr)} />
        </Section>

        {/* ── Pricing ──────────────────────────────────────────────── */}
        <Section title="Pricing">
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Price (PKR) *">
              <input className={ctl} type="number" min="0" required value={f.price} onChange={(e) => set('price', e.target.value)} />
            </Field>
            <Field label="Compare-at Price">
              <input className={ctl} type="number" min="0" value={f.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} placeholder="e.g. 1550" disabled={!f.onSale} />
            </Field>
            <Field label="Cost / Wholesale">
              <input className={ctl} type="number" min="0" value={f.costPrice} onChange={(e) => set('costPrice', e.target.value)} placeholder="e.g. 800" />
            </Field>
          </div>
          {Number(f.price) > 0 && Number(f.costPrice) > 0 && (
            <div className="mt-4 rounded-md border border-[#EAEAEA] bg-[#FAFAFA] p-4">
              <div className="flex items-center gap-6 text-[13px]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Profit per unit</p>
                  <p className="mt-1 text-[16px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(profit)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Margin</p>
                  <p className="mt-1 text-[16px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{margin.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ── Variants ─────────────────────────────────────────────── */}
        <Section title="Variants">
          <div className="space-y-5">
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
                    <input type="color" value={c.hex} onChange={(e) => set('colors', f.colors.map((x, j) => j === i ? { ...x, hex: e.target.value } : x))} className="h-9 w-12 cursor-pointer rounded-md border border-[#DCDCDC] bg-white p-1" />
                    <input className={ctl} value={c.name} onChange={(e) => set('colors', f.colors.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Colour name" />
                    {f.colors.length > 1 && (
                      <button type="button" onClick={() => set('colors', f.colors.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-md text-[#AAAAAA] transition hover:bg-[#F5F5F5] hover:text-black" aria-label="Remove colour"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => set('colors', [...f.colors, { name: '', hex: '#69625F' }])} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#999999] transition-colors hover:text-black">
                  + Add Colour
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
                  Build from Sizes × Colours
                </button>
              </div>
            </div>
            {(f.variants || []).length > 0 && (
              <div className="overflow-x-auto rounded-md border border-[#EAEAEA]">
                <table className="w-full min-w-[720px] text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]">
                      {['Size', 'Colour', 'SKU', 'Barcode', 'Price', 'Stock'].map((h) => (
                        <th key={h} className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {f.variants.map((v, i) => (
                      <tr key={v.key || i} className="border-b border-[#F0F0F0] last:border-0">
                        <td className="px-3 py-2.5 text-[#777777]">{v.size || '—'}</td>
                        <td className="px-3 text-[#777777]">{v.color || '—'}</td>
                        <td className="px-2 py-1.5"><input className={`${ctl} !h-7`} value={v.sku || ''} onChange={(e) => set('variants', f.variants.map((x, j) => j === i ? { ...x, sku: e.target.value } : x))} /></td>
                        <td className="px-2"><input className={`${ctl} !h-7`} value={v.barcode || ''} onChange={(e) => set('variants', f.variants.map((x, j) => j === i ? { ...x, barcode: e.target.value } : x))} /></td>
                        <td className="px-2"><input className={`${ctl} !h-7`} type="number" value={v.price ?? ''} onChange={(e) => set('variants', f.variants.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} /></td>
                        <td className="px-2"><input className={`${ctl} !h-7`} type="number" value={v.stock ?? 0} onChange={(e) => set('variants', f.variants.map((x, j) => j === i ? { ...x, stock: e.target.value } : x))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Section>

        {/* ── Inventory ────────────────────────────────────────────── */}
        <Section title="Inventory">
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Stock">
              <input className={ctl} type="number" min="0" value={f.stock} onChange={(e) => set('stock', e.target.value)} />
            </Field>
            <Field label="Reorder Point">
              <input className={ctl} type="number" min="0" value={f.reorderPoint} onChange={(e) => set('reorderPoint', e.target.value)} />
            </Field>
            <Field label="Safety Stock">
              <input className={ctl} type="number" min="0" value={f.safetyStock} onChange={(e) => set('safetyStock', e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* ── Organization ─────────────────────────────────────────── */}
        <Section title="Organization">
          <div className="grid gap-5 md:grid-cols-3">
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
              <div className="flex flex-wrap gap-1.5 rounded-md border border-[#DCDCDC] bg-white px-3 py-2.5">
                {(f.tags || []).map((t, i) => (
                  <span key={t + i} className="inline-flex items-center gap-1 rounded-sm bg-black py-0.5 pl-2.5 pr-1 text-[11px] font-medium uppercase tracking-[0.08em] text-black">
                    {t}
                    <button type="button" onClick={() => set('tags', (f.tags || []).filter((_, j) => j !== i))} className="grid h-4 w-4 place-items-center hover:opacity-60">×</button>
                  </span>
                ))}
                <input className="min-w-[120px] flex-1 bg-transparent px-2 py-1 text-[13px] text-black outline-none placeholder:text-[#AAAAAA]" placeholder="Add tag + Enter" onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const v = e.currentTarget.value.trim().toLowerCase(); if (v && !(f.tags || []).includes(v)) set('tags', [...(f.tags || []), v]); e.currentTarget.value = ''; }
                  else if (e.key === 'Backspace' && !e.currentTarget.value && (f.tags || []).length) set('tags', (f.tags || []).slice(0, -1));
                }} />
              </div>
            </Field>
          </div>
          <div className="mt-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Badges</p>
            <div className="flex flex-wrap gap-2">
              {BADGE_POOL.map((b) => {
                const active = f.badges.includes(b);
                return (
                  <button type="button" key={b} onClick={() => set('badges', active ? f.badges.filter((x) => x !== b) : [...f.badges, b])}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all duration-150 ${active ? 'bg-black text-white' : 'border border-[#EAEAEA] text-[#777777] hover:border-[#DCDCDC] hover:text-black'}`}>
                    {active && <CheckIcon size={11} />}{b}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ── Content ──────────────────────────────────────────────── */}
        <Section title="Content">
          <Field label="Care Instructions" hint="One per line">
            <textarea className={`${ctl} min-h-[88px] !h-auto py-3`} value={f.careText} onChange={(e) => set('careText', e.target.value)} rows={3} placeholder={'Machine wash cold\nDo not bleach\nTumble dry low'} />
          </Field>
        </Section>

        {/* ── Publishing ───────────────────────────────────────────── */}
        <Section title="Publishing">
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Status">
                <select className={ctl} value={f.status || 'active'} onChange={(e) => set('status', e.target.value)}>
                  <option value="active">Active — live in store</option>
                  <option value="draft">Draft — hidden, work in progress</option>
                </select>
              </Field>
              <div className="flex flex-col justify-end gap-1">
                <Check k="isFeatured" label="Featured in signature edit" f={f} set={set} />
                <Check k="isBestSeller" label="Mark as best seller" f={f} set={set} />
              </div>
            </div>

            <div className="border-t border-[#EAEAEA] pt-5">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={f.onSale === true}
                  onChange={(e) => {
                    const on = e.target.checked;
                    set('onSale', on);
                    if (!on) { set('saleStart', ''); set('saleEnd', ''); set('compareAtPrice', ''); }
                  }}
                  className="h-4 w-4 rounded-sm accent-black"
                />
                <span className="text-[13px] font-medium text-black">On sale — appears in /sale, shows % off</span>
              </label>
              {!f.onSale ? (
                <p className="mt-2 text-[12px] text-[#AAAAAA]">Off by default — new products are never automatically discounted.</p>
              ) : (
                <>
                  {f.compareAtPrice && Number(f.compareAtPrice) > 0 && Number(f.price) > 0 && Number(f.compareAtPrice) <= Number(f.price) && (
                    <p className="mt-2 text-[12px] text-[#777777]">Was price must be higher than the selling price — otherwise there is no real discount.</p>
                  )}
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Sale Starts">
                      <input type="datetime-local" className={ctl} value={f.saleStart} onChange={(e) => set('saleStart', e.target.value)} />
                    </Field>
                    <Field label="Sale Ends">
                      <input type="datetime-local" className={ctl} value={f.saleEnd} onChange={(e) => set('saleEnd', e.target.value)} />
                    </Field>
                  </div>
                </>
              )}
            </div>
          </div>
        </Section>

        {/* ── Bottom actions ────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-end gap-2 pb-8 pt-2">
          <button type="button" disabled={busy} onClick={(e) => save(e, 'draft')} className={btnGhost}>
            <EyeOff size={12} /> Save as Draft
          </button>
          <button disabled={busy} className={btnSolid}>
            <Save size={12} /> {busy ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
