import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileEdit, Plus, Save, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import ImageTiles from '../components/ImageTiles';

const BADGE_POOL = ['Breathable', 'Cooling', 'Seamless', 'Sweat Control', 'Support', 'Quick Dry', '4-Way Stretch', 'Tag-Free', 'Silk-Touch', 'Value Pack'];
const EMPTY = {
  name: '', sku: '', gender: 'women', categorySlug: '', category: '', tier: 'Standard', price: '', compareAtPrice: '',
  stock: 25, images: [], video: '', shortDescription: '', description: '', sizesText: '', fabric: '',
  colors: [{ name: 'Black', hex: '#1A1A1A' }], badges: [], careText: '', isFeatured: false, isBestSeller: false, isActive: true, status: 'active', bundleSlug: '',
};

// Module-level checkbox (stable identity)
function Check({ k, label, f, set }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 accent-[#0D0D0D]" />{label}
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
        if (p.video && !imgs.includes(p.video)) imgs.push(p.video); // legacy video field → media tile
        setF({
          ...EMPTY, ...p, price: String(p.price), compareAtPrice: p.compareAtPrice || '',
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
    if (images.length < 4) { toast('Add at least 4 images (tiles par + dabayen)'); return; }
    const cat = cats.find((c) => c.slug === f.categorySlug);
    const body = {
      name: f.name, sku: f.sku || `VL-${Date.now().toString(36).toUpperCase()}`, gender: f.gender,
      tier: f.tier, price: Number(f.price), compareAtPrice: f.compareAtPrice ? Number(f.compareAtPrice) : null,
      stock: Number(f.stock) || 0, images, video: '', shortDescription: f.shortDescription, description: f.description,
      sizes: f.sizesText.split(',').map((s) => s.trim()).filter(Boolean),
      colors: f.colors.filter((c) => c.name && c.hex),
      fabric: f.fabric, badges: f.badges, care: f.careText.split('\n').map((s) => s.trim()).filter(Boolean),
      isFeatured: f.isFeatured, isBestSeller: f.isBestSeller, isActive: f.isActive, status: forceStatus || f.status || 'active',
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

  return (
    <AdminLayout title={isNew ? 'Add Product' : 'Edit Product'}>
      <Link to="/admin/products" className="btn-outline mb-6 !px-4 !py-2 !text-[11px]"><ArrowLeft size={13} /> Back to products</Link>

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="card space-y-5 p-6">
            <div><label className="label">Name *</label><input className="input" required value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Aura Seamless Wireless Bra" /></div>
            <div><label className="label">Short description</label><input className="input" value={f.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="One refined line for cards and listings" /></div>
            <div><label className="label">Full description</label><textarea className="input min-h-32" value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
          </div>

          <div className="card p-6">
            <label className="label">Product media * (minimum 4 — photos + videos)</label>
            <ImageTiles images={f.images} onChange={(arr) => set('images', arr)} />
          </div>


          <div className="card grid gap-5 p-6 md:grid-cols-2">
            <div><label className="label">Sizes (comma separated)</label><input className="input" value={f.sizesText} onChange={(e) => set('sizesText', e.target.value)} placeholder="S, M, L, XL" /></div>
            <div><label className="label">Fabric</label><input className="input" value={f.fabric} onChange={(e) => set('fabric', e.target.value)} placeholder="92% combed cotton, 8% elastane" /></div>
            <div className="md:col-span-2"><label className="label">Care instructions (one per line)</label><textarea className="input min-h-20" value={f.careText} onChange={(e) => set('careText', e.target.value)} /></div>
          </div>

          <div className="card p-6">
            <p className="label">Badges</p>
            <div className="flex flex-wrap gap-2">
              {BADGE_POOL.map((b) => (
                <button type="button" key={b} onClick={() => set('badges', f.badges.includes(b) ? f.badges.filter((x) => x !== b) : [...f.badges, b])}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${f.badges.includes(b) ? 'border-sagedeep bg-sage/25 text-sagedeep' : 'border-line text-ash hover:border-sage'}`}>{b}</button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <p className="label">Colours</p>
            <div className="space-y-2.5">
              {f.colors.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="color" value={c.hex} onChange={(e) => set('colors', f.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-white px-1" />
                  <input className="input !w-44" value={c.name} onChange={(e) => set('colors', f.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Colour name" />
                  <button type="button" onClick={() => set('colors', f.colors.filter((_, j) => j !== i))} className="rounded-full p-2 text-ash hover:text-red-700" aria-label="Remove"><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" onClick={() => set('colors', [...f.colors, { name: '', hex: '#69625F' }])} className="btn-outline !px-4 !py-2 !text-[11px]"><Plus size={13} /> Add colour</button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <div className="card space-y-5 p-6">
            <div>
              <label className="label">Gender *</label>
              <select className="input" value={f.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="women">Women</option><option value="men">Men</option>
              </select>
            </div>
            <div>
              <label className="label">Category *</label>
              <select className="input" required value={f.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}>
                <option value="">Choose…</option>
                {catOpts.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tier *</label>
              <select className="input" value={f.tier} onChange={(e) => set('tier', e.target.value)}>
                {['Economy', 'Standard', 'Premium'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Price (PKR) *</label><input className="input" type="number" required min="0" value={f.price} onChange={(e) => set('price', e.target.value)} /></div>
              <div><label className="label">Compare-at</label><input className="input" type="number" min="0" value={f.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} placeholder="Optional" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Stock</label><input className="input" type="number" min="0" value={f.stock} onChange={(e) => set('stock', e.target.value)} /></div>
              <div><label className="label">SKU</label><input className="input" value={f.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Auto" /></div>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={f.status || 'active'} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Active — live in store</option>
                <option value="draft">Draft — hidden, work in progress</option>
              </select>
              {f.status === 'draft' && <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 ring-1 ring-amber-200">Draft products store mein nazar nahi aate aur order nahi ho sakte — jab ready ho to Active karein.</p>}
            </div>
            <div>
              <label className="label">Bundle suggestion (category slug)</label>
              <select className="input" value={f.bundleSlug} onChange={(e) => set('bundleSlug', e.target.value)}>
                <option value="">None</option>
                {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2.5 border-t border-line pt-4">
              <Check k="isFeatured" label="Featured (Signature edit)" f={f} set={set} />
              <Check k="isBestSeller" label="Best seller" f={f} set={set} />
              <Check k="isActive" label="Active (visible in store)" f={f} set={set} />
            </div>
          </div>
          <button disabled={busy} className="btn-primary w-full"><Save size={15} /> {busy ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}</button>
          <button type="button" disabled={busy} onClick={(e) => save(e, 'draft')} className="btn-outline w-full !py-2.5 !text-[11px]" title="Store mein show nahi hoga — Drafts mein save hoga"><FileEdit size={13} /> Save as draft</button>
        </div>
      </form>
    </AdminLayout>
  );
}
