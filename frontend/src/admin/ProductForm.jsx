import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckIcon, EyeOff, ImagePlus, Info, Plus,
  Save, Sparkles, Tag, Trash2,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import ImageTiles from '../components/ImageTiles';

/* ============================================================================
 * PRODUCT FORM — Shopify-style clean redesign.
 *
 * Layout: 2-column grid (main content + right sidebar)
 * Sections: General → Media → Variants → Badges → Pricing (sidebar)
 * Each section has a clear heading + description.
 * ========================================================================== */

const BADGE_POOL = ['Breathable', 'Cooling', 'Seamless', 'Sweat Control', 'Support', 'Quick Dry', '4-Way Stretch', 'Tag-Free', 'Silk-Touch', 'Value Pack'];

const EMPTY = {
  name: '', sku: '', gender: 'women', categorySlug: '', category: '',
  tier: 'Standard', price: '', compareAtPrice: '', costPrice: '',
  /* v2 — sale windows. New products are NOT on sale by default: the merchant
     must switch the sale on explicitly, otherwise a fresh launch can never
     accidentally carry a "30% off" strike-through. */
  onSale: false, saleStart: '', saleEnd: '',
  stock: 25, images: [], video: '', shortDescription: '', description: '',
  sizesText: '', fabric: '', colors: [{ name: 'Black', hex: '#1A1A1A' }],
  badges: [], tags: [], careText: '',
  isFeatured: false, isBestSeller: false, isActive: true, status: 'active', bundleSlug: '',
};

/* datetime-local inputs need "YYYY-MM-DDTHH:MM"; the API stores full ISO. */
const toLocalInput = (iso) => (iso ? String(iso).slice(0, 16) : '');

/* ── Section wrapper ─────────────────────────────────────────────────── */
function Section({ icon: Icon, title, description, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-neutral-200 bg-white ${className}`}>
      <div className="border-b border-neutral-100 px-6 py-4">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon size={16} className="text-neutral-500" />}
          <div>
            <h3 className="text-[12px] font-semibold text-neutral-900">{title}</h3>
            {description && <p className="mt-0.5 text-[12px] text-neutral-500">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

/* ── Field wrapper ────────────────────────────────────────────────────── */
function Field({ label, hint, children }) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-widest text-neutral-500">{label}</label>}
      {children}
      {hint && <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">{hint}</p>}
    </div>
  );
}

function Check({ k, label, f, set }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg py-1.5 text-[13px] font-medium text-neutral-700 transition hover:text-neutral-900">
      <input type="checkbox" checked={!!f[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 rounded accent-neutral-900" />
      {label}
    </label>
  );
}

/* ═════════════════════════════════════════════════════════════════════ */
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
    /* v2 — sale windows: when the sale switch is off, the was-price is
       cleared too (a strike-through with no sale is a pricing lie). When it
       is on, the was-price must be higher than the price or the sale is fake. */
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
      {/* Back button */}
      <Link to="/admin/products" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition hover:text-neutral-900">
        <ArrowLeft size={14} /> Back to products
      </Link>

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ═══ MAIN COLUMN ══════════════════════════════════════════════ */}
        <div className="space-y-5">

          {/* ── General ───────────────────────────────────────────────── */}
          <Section icon={Info} title="General" description="Product name, description, and identity">
            <div className="space-y-4">
              <Field label="Product name *">
                <input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[12px] font-medium outline-none transition focus:border-neutral-900" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Aura Seamless Wireless Bra" required />
              </Field>
              <Field label="Short description" hint="One line shown on cards and listings">
                <input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[13px] outline-none transition focus:border-neutral-900" value={f.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="Second-skin comfort with invisible support" />
              </Field>
              <Field label="Full description">
                <textarea className="w-full min-h-[120px] rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[13px] leading-relaxed outline-none transition focus:border-neutral-900" value={f.description} onChange={(e) => set('description', e.target.value)} rows={5} placeholder="Describe your product in detail..." />
              </Field>
            </div>
          </Section>

          {/* ── Media ─────────────────────────────────────────────────── */}
          <Section icon={ImagePlus} title="Media" description="Product photos (min 4) — drag to reorder">
            <ImageTiles images={f.images} onChange={(arr) => set('images', arr)} />
          </Section>

          {/* ── Variants ──────────────────────────────────────────────── */}
          <Section icon={Tag} title="Variants" description="Sizes, fabric, colours, tags, care">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Sizes (comma separated)" hint="e.g. S, M, L, XL">
                  <input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[13px] outline-none transition focus:border-neutral-900" value={f.sizesText} onChange={(e) => set('sizesText', e.target.value)} placeholder="S, M, L, XL" />
                </Field>
                <Field label="Fabric" hint="e.g. 92% combed cotton, 8% elastane">
                  <input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[13px] outline-none transition focus:border-neutral-900" value={f.fabric} onChange={(e) => set('fabric', e.target.value)} placeholder="92% combed cotton, 8% elastane" />
                </Field>
              </div>

              {/* Tags */}
              <Field label="Tags" hint="Used for filters and smart collections">
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-neutral-300 bg-white p-2.5">
                  {(f.tags || []).map((t, i) => (
                    <span key={t + i} className="inline-flex items-center gap-1 rounded-full bg-neutral-900 py-0.5 pl-2.5 pr-1 text-[12px] font-semibold text-white">
                      {t}
                      <button type="button" onClick={() => set('tags', (f.tags || []).filter((_, j) => j !== i))} className="grid h-4 w-4 place-items-center rounded-full bg-white/20 hover:bg-white/30">×</button>
                    </span>
                  ))}
                  <input className="min-w-[120px] flex-1 bg-transparent px-2 py-1 text-[13px] outline-none placeholder:text-neutral-400" placeholder="Add tag + Enter" onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const v = e.currentTarget.value.trim().toLowerCase(); if (v && !(f.tags || []).includes(v)) set('tags', [...(f.tags || []), v]); e.currentTarget.value = ''; }
                    else if (e.key === 'Backspace' && !e.currentTarget.value && (f.tags || []).length) set('tags', (f.tags || []).slice(0, -1));
                  }} />
                </div>
              </Field>

              {/* Colours */}
              <Field label="Colours">
                <div className="space-y-2">
                  {f.colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <input type="color" value={c.hex} onChange={(e) => set('colors', f.colors.map((x, j) => j === i ? { ...x, hex: e.target.value } : x))} className="h-10 w-12 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1" />
                      <input className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[13px] outline-none transition focus:border-neutral-900" value={c.name} onChange={(e) => set('colors', f.colors.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Colour name" />
                      {f.colors.length > 1 && (
                        <button type="button" onClick={() => set('colors', f.colors.filter((_, j) => j !== i))} className="grid h-9 w-9 place-items-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => set('colors', [...f.colors, { name: '', hex: '#69625F' }])} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3.5 py-2 text-[12px] font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900"><Plus size={12} /> Add colour</button>
                </div>
              </Field>

              <Field label="Care instructions (one per line)">
                <textarea className="w-full min-h-[80px] rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[13px] outline-none transition focus:border-neutral-900" value={f.careText} onChange={(e) => set('careText', e.target.value)} rows={3} placeholder="Machine wash cold&#10;Do not bleach&#10;Tumble dry low" />
              </Field>
            </div>
          </Section>

          {/* ── Badges ────────────────────────────────────────────────── */}
          <Section icon={Sparkles} title="Badges" description="Visual tags shown on product cards">
            <div className="flex flex-wrap gap-2">
              {BADGE_POOL.map((b) => {
                const active = f.badges.includes(b);
                return (
                  <button type="button" key={b} onClick={() => set('badges', active ? f.badges.filter((x) => x !== b) : [...f.badges, b])}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-medium transition ${active ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'}`}>
                    {active && <CheckIcon size={12} />}{b}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>

        {/* ═══ RIGHT SIDEBAR ═══════════════════════════════════════════ */}
        <div className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          {/* ── Status ────────────────────────────────────────────────── */}
          <Section title="Status">
            <div className="space-y-3">
              <Field label="Visibility">
                <select className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[13px] font-medium outline-none transition focus:border-neutral-900" value={f.status || 'active'} onChange={(e) => set('status', e.target.value)}>
                  <option value="active">Active — live in store</option>
                  <option value="draft">Draft — hidden, work in progress</option>
                </select>
              </Field>
              {f.status === 'draft' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">Draft products are hidden and cannot be ordered.</div>
              )}
              <Check k="isFeatured" label="Featured in signature edit" f={f} set={set} />
              <Check k="isBestSeller" label="Mark as best seller" f={f} set={set} />
            </div>
          </Section>

          {/* ── Organization ──────────────────────────────────────────── */}
          <Section icon={Tag} title="Organization">
            <div className="space-y-4">
              <Field label="Gender">
                <select className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[13px] font-medium outline-none transition focus:border-neutral-900" value={f.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="women">Women</option><option value="men">Men</option>
                </select>
              </Field>
              <Field label="Category *">
                <select className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[13px] font-medium outline-none transition focus:border-neutral-900" required value={f.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}>
                  <option value="">Choose category…</option>
                  {catOpts.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Tier">
                <select className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[13px] font-medium outline-none transition focus:border-neutral-900" value={f.tier} onChange={(e) => set('tier', e.target.value)}>
                  {['Economy', 'Standard', 'Premium'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="SKU" hint="Auto-generated if left empty">
                <input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[13px] outline-none transition focus:border-neutral-900" value={f.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Auto" />
              </Field>
            </div>
          </Section>

          {/* ── Pricing ───────────────────────────────────────────────── */}
          <Section icon={Info} title="Pricing">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (PKR) *">
                  <input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[12px] font-semibold outline-none transition focus:border-neutral-900" type="number" min="0" required value={f.price} onChange={(e) => set('price', e.target.value)} />
                </Field>
                <Field label="Compare-at (Was price)">
                  <input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[12px] outline-none transition focus:border-neutral-900" type="number" min="0" value={f.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} placeholder="e.g. 1550" disabled={!f.onSale} />
                </Field>
              </div>

              {/* ── Sale window (v2) ──
                  A product is on sale ONLY when this switch is on. New
                  products start OFF, so nothing you launch is ever
                  automatically discounted. */}
              <div className={`rounded-xl border p-4 transition-colors ${f.onSale ? 'border-emerald-300 bg-emerald-50/60' : 'border-neutral-200 bg-white'}`}>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={f.onSale === true}
                    onChange={(e) => {
                      const on = e.target.checked;
                      set('onSale', on);
                      if (!on) { set('saleStart', ''); set('saleEnd', ''); set('compareAtPrice', ''); }
                    }}
                    className="h-4 w-4 rounded accent-neutral-900"
                  />
                  <span className="text-[13px] font-semibold text-neutral-900">On sale — appears in /sale, shows % off</span>
                </label>
                {!f.onSale ? (
                  <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">
                    Off by default — new products are never automatically discounted. Turn this on to run a sale.
                  </p>
                ) : (
                  <>
                    {f.compareAtPrice && Number(f.compareAtPrice) > 0 && Number(f.price) > 0 && Number(f.compareAtPrice) <= Number(f.price) && (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-700 ring-1 ring-red-200">
                        Was price must be HIGHER than the selling price — otherwise there is no real discount.
                      </p>
                    )}
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label="Sale starts (optional)">
                        <input type="datetime-local" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-[12px] outline-none transition focus:border-neutral-900" value={f.saleStart} onChange={(e) => set('saleStart', e.target.value)} />
                      </Field>
                      <Field label="Sale ends (optional)">
                        <input type="datetime-local" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-[12px] outline-none transition focus:border-neutral-900" value={f.saleEnd} onChange={(e) => set('saleEnd', e.target.value)} />
                      </Field>
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">
                      Leave dates empty for an open-ended sale. With an end date, customers see “Sale ends {f.saleEnd ? new Date(f.saleEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '…' }” on the product page — with urgency when it is under 7 days away.
                    </p>
                  </>
                )}
              </div>

              {/* Cost + Profit live */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-bold uppercase tracking-widest text-neutral-500">Cost & profit</p>
                  <span className="text-[13px] text-neutral-400">Internal only</span>
                </div>
                <Field label="Cost / Wholesale (PKR)">
                  <input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[13px] outline-none transition focus:border-neutral-900" type="number" min="0" value={f.costPrice} onChange={(e) => set('costPrice', e.target.value)} placeholder="e.g. 800" />
                </Field>
                {Number(f.price) > 0 && Number(f.costPrice) > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-3 py-2.5">
                    <span className="text-[13px] font-semibold text-neutral-700">Profit per unit</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[12px] font-bold tabular-nums ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>PKR {profit.toLocaleString('en-PK')}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[13px] font-bold ${margin >= 40 ? 'bg-emerald-100 text-emerald-800' : margin >= 20 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>{margin.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>

              <Field label="Stock quantity">
                <input className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[13px] outline-none transition focus:border-neutral-900" type="number" min="0" value={f.stock} onChange={(e) => set('stock', e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="space-y-2.5">
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 py-3 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-50">
              <Save size={14} /> {busy ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
            </button>
            <button type="button" disabled={busy} onClick={(e) => save(e, 'draft')} className="flex w-full items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white py-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50">
              <EyeOff size={13} /> Save as draft
            </button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
