import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import Seo from '../components/Seo';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const TIERS = ['Economy', 'Standard', 'Premium'];
const BADGES = ['Breathable', 'Cooling', 'Seamless', 'Sweat Control', 'Support', 'Silk-Touch', 'Quick Dry'];
const COLORS = [
  { name: 'Black', hex: '#1A1A1A' }, { name: 'Soft White', hex: '#FFFFFF' }, { name: 'White', hex: '#FFFFFF' },
  { name: 'Nude', hex: '#E3C9B3' }, { name: 'Blush', hex: '#E8C7C8' }, { name: 'Sage', hex: '#8F9C8B' },
  { name: 'Slate', hex: '#6B7280' }, { name: 'Navy', hex: '#1F2A44' }, { name: 'Charcoal', hex: '#3A3A3A' },
  { name: 'Heather Grey', hex: '#9AA0A6' }, { name: 'Olive', hex: '#6B7252' },
];
const SORTS = [
  ['popular', 'Most Popular'], ['newest', 'Newest'], ['price-asc', 'Price: Low to High'], ['price-desc', 'Price: High to Low'],
];

const TITLES = {
  women: ['Women', 'Second-skin essentials — bras, panties, shapewear, sleepwear and layers.'],
  men: ['Men', 'The everyday rotation, perfected — briefs, boxers, trunks, vests and base layers.'],
  new: ['New Arrivals', 'Fresh from the studio — the latest additions to the edit.'],
  best: ['Best Sellers', 'The pieces Pakistan keeps reordering.'],
  sale: ['Sale', 'Quiet luxury, gentler prices — while stock lasts.'],
  all: ['Shop All', 'The complete HUSHAE edit for men and women.'],
};

export default function Shop({ preset = {} }) {
  const [params, setParams] = useSearchParams();
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const get = (k) => params.get(k) || '';
  const catParam = preset.category || get('category');
  const gender = preset.gender || get('gender');
  const sort = get('sort') || preset.sort || 'popular';

  useEffect(() => { api('/categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    if (gender) sp.set('gender', gender);
    if (catParam) sp.set('category', catParam);
    if (get('q')) sp.set('q', get('q'));
    if (get('tier')) sp.set('tier', get('tier'));
    if (get('size')) sp.set('size', get('size'));
    if (get('color')) sp.set('color', get('color'));
    if (get('badge')) sp.set('badge', get('badge'));
    sp.set('sort', sort);
    if (preset.bestSeller) sp.set('bestSeller', 'true');
    if (preset.sale) sp.set('sale', 'true');
    sp.set('limit', '120');
    return sp.toString();
  }, [params, preset]); // eslint-disable-line

  useEffect(() => {
    setProducts(null);
    api(`/products?${qs}`).then((d) => setProducts(d.products)).catch(() => setProducts([]));
    window.scrollTo({ top: 0 });
  }, [qs]);

  const setParam = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v); else n.delete(k);
    setParams(n, { replace: true });
  };
  const toggleParam = (k, v) => setParam(k, get(k) === v ? '' : v);

  const activeCat = cats.find((c) => c.slug === catParam);
  const meta = activeCat
    ? [activeCat.name, activeCat.description]
    : TITLES[preset.key] || (get('q') ? [`“${get('q')}”`, 'Search results'] : TITLES.all);

  const catList = gender ? cats.filter((c) => c.gender === gender) : cats;
  const activeFilters = ['tier', 'size', 'color', 'badge'].filter((k) => get(k)).length;

  const FilterPanel = (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ash">Category</p>
        <div className="space-y-1">
          {catList.map((c) => (
            <button key={c.slug} onClick={() => setParam('category', catParam === c.slug ? '' : c.slug)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${catParam === c.slug ? 'bg-obsidian text-alabaster' : 'text-obsidian/75 hover:bg-satin/60'}`}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ash">Tier</p>
        <div className="flex flex-wrap gap-2">
          {TIERS.map((t) => (
            <button key={t} onClick={() => toggleParam('tier', t)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${get('tier') === t ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line text-ash hover:border-obsidian/40'}`}>{t}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ash">Size</p>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button key={s} onClick={() => toggleParam('size', s)}
              className={`min-w-10 rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${get('size') === s ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line text-ash hover:border-obsidian/40'}`}>{s}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ash">Colour</p>
        <div className="flex flex-wrap gap-2.5">
          {COLORS.map((c) => (
            <button key={c.name} onClick={() => toggleParam('color', c.name)} title={c.name}
              className={`h-7 w-7 rounded-full border transition ${get('color') === c.name ? 'ring-2 ring-obsidian ring-offset-2 ring-offset-alabaster' : 'border-line'}`}
              style={{ backgroundColor: c.hex }} />
          ))}
        </div>
        {get('color') && <button onClick={() => setParam('color', '')} className="mt-2 text-xs text-ash underline">{get('color')} — clear</button>}
      </div>
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ash">Fabric Tech</p>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((b) => (
            <button key={b} onClick={() => toggleParam('badge', b)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${get('badge') === b ? 'border-sagedeep bg-sage/25 text-sagedeep' : 'border-line text-ash hover:border-sage'}`}>{b}</button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-10 md:px-8">
      <Seo
        title={`${meta[0]}${gender ? ' — ' + gender.charAt(0).toUpperCase() + gender.slice(1) : ''}`}
        description={meta[1] || 'Shop premium innerwear — bras, briefs, shapewear aur zyada. Made in Pakistan.'}
        canonical={typeof window !== 'undefined' ? window.location.pathname : '/shop'}
      />
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">HUSHAE — {gender || 'all'}</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl md:text-5xl">{meta[0]}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">{meta[1]}</p>
      </div>

      {/* Toolbar */}
      <div className="mb-8 flex items-center justify-between gap-3 border-y border-line py-3.5">
        <button onClick={() => setFiltersOpen(true)} className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-obsidian lg:hidden">
          <SlidersHorizontal size={15} /> Filters {activeFilters > 0 && `(${activeFilters})`}
        </button>
        <p className="hidden text-xs uppercase tracking-widest text-ash lg:block">
          {products ? `${products.length} pieces` : 'Loading…'}
        </p>
        <div className="relative">
          <select value={sort} onChange={(e) => setParam('sort', e.target.value)}
            className="appearance-none rounded-full border border-line bg-white/70 py-2 pl-4 pr-9 text-xs font-semibold outline-none transition hover:border-obsidian/40">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ash" />
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[230px_1fr]">
        <aside className="hidden lg:block"><div className="sticky top-28">{FilterPanel}</div></aside>

        <div>
          {products === null ? (
            <ProductGridSkeleton />
          ) : products.length === 0 ? (
            <div className="grid place-items-center rounded-3xl border border-dashed border-line py-24 text-center">
              <p className="font-display text-xl">Nothing matches those filters</p>
              <p className="mt-2 text-sm text-ash">Try removing a filter or two.</p>
              <button onClick={() => setParams({}, { replace: true })} className="btn-outline mt-6">Clear Filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filters drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 bg-obsidian/30 lg:hidden" onClick={() => setFiltersOpen(false)}>
          <div className="h-full w-[88%] max-w-sm overflow-y-auto bg-alabaster p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <p className="font-display text-xl">Filters</p>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close"><X size={20} /></button>
            </div>
            {FilterPanel}
            <button onClick={() => setFiltersOpen(false)} className="btn-primary mt-8 w-full">Show {products?.length ?? ''} Results</button>
          </div>
        </div>
      )}
    </div>
  );
}
