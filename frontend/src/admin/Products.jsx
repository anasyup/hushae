import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

export default function Products() {
  const { auth, toast } = useApp();
  const [list, setList] = useState(null);
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ q: '', category: '', gender: '', tier: '', stock: '' });

  const load = () => {
    const sp = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v && sp.set(k, v));
    api(`/products/admin/list?${sp}`, { token: auth.token }).then((d) => setList(d.products)).catch(() => setList([]));
  };
  useEffect(load, [f.category, f.gender, f.tier, f.stock]); // eslint-disable-line
  useEffect(() => { api('/categories?all=1').then((d) => setCats(d.categories)).catch(() => {}); }, []);

  const disable = async (p) => {
    try { await api(`/products/${p._id}`, { method: 'DELETE', token: auth.token }); toast('Product disabled'); load(); }
    catch (ex) { toast(ex.message); }
  };

  const sel = (k, label, opts) => (
    <select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="input !w-40">
      <option value="">{label}</option>
      {opts.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  );

  return (
    <AdminLayout title="Products">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-ash" />
          <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search name or SKU…" className="input !w-64 !pl-10" />
        </form>
        {sel('gender', 'All genders', ['women', 'men'])}
        {sel('category', 'All categories', cats.map((c) => ({ value: c.slug, label: `${c.name} (${c.gender[0].toUpperCase()})` })))}
        {sel('tier', 'All tiers', ['Economy', 'Standard', 'Premium'])}
        {sel('stock', 'Any stock', [{ value: 'low', label: 'Low (≤5)' }, { value: 'out', label: 'Out of stock' }])}
        <Link to="/admin/products/new" className="btn-primary !px-5 !py-2.5 !text-[11px]"><Plus size={14} /> Add Product</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[880px]">
          <thead><tr className="border-b border-line bg-satin/30">{['Product', 'SKU', 'Tier', 'Price', 'Stock', 'Flags', ''].map((h) => <th key={h} className="table-head">{h}</th>)}</tr></thead>
          <tbody>
            {(list || []).map((p) => (
              <tr key={p._id} className={`border-b border-line/60 transition hover:bg-satin/20 ${!p.isActive ? 'opacity-45' : ''}`}>
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <Img src={p.images[0]?.url} alt="" className="h-12 w-9 rounded-lg object-cover" />
                    <div><p className="max-w-56 clamp-2 text-[13px] font-medium leading-snug">{p.name}</p><p className="text-[10px] uppercase tracking-wider text-ash">{p.gender} · {p.categorySlug}</p></div>
                  </div>
                </td>
                <td className="table-cell font-mono text-xs text-ash">{p.sku}</td>
                <td className="table-cell"><span className={`pill ${p.tier === 'Premium' ? 'bg-obsidian text-alabaster' : p.tier === 'Standard' ? 'bg-satin text-obsidian' : 'bg-sage/25 text-sagedeep'}`}>{p.tier}</span></td>
                <td className="table-cell font-semibold">{pkr(p.price)}{p.compareAtPrice && <span className="ml-1 text-[11px] font-normal text-ash line-through">{pkr(p.compareAtPrice)}</span>}</td>
                <td className="table-cell"><span className={`pill ${p.stock === 0 ? 'bg-red-100 text-red-800' : p.stock <= 5 ? 'bg-red-50 text-red-700' : 'bg-sage/20 text-sagedeep'}`}>{p.stock}</span></td>
                <td className="table-cell text-[10px] font-bold uppercase tracking-wider text-ash">
                  {p.isFeatured && <span className="mr-1.5 text-sagedeep">Featured</span>}
                  {p.isBestSeller && <span>Best</span>}
                  {!p.isActive && <span className="text-red-700">Disabled</span>}
                </td>
                <td className="table-cell">
                  <div className="flex gap-2">
                    <Link to={`/admin/products/${p._id}`} className="rounded-full border border-line p-2 text-ash transition hover:border-obsidian hover:text-obsidian" aria-label="Edit"><Pencil size={13} /></Link>
                    {p.isActive && <button onClick={() => disable(p)} className="rounded-full border border-line px-3 py-2 text-[10px] font-bold uppercase text-ash transition hover:border-red-300 hover:text-red-700">Disable</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list === null && <div className="p-6"><div className="skeleton h-40 w-full" /></div>}
        {list?.length === 0 && <p className="py-14 text-center text-sm text-ash">No products match.</p>}
      </div>
    </AdminLayout>
  );
}
