import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchX, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import EmptyState from '../components/ui/EmptyState';
import Seo from '../components/Seo';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import FilterSheet from './shop/FilterSheet';
import ActiveChips from './shop/ActiveChips';

const TITLES = { women: 'Women', men: 'Men', new: 'New Arrivals', best: 'Best Sellers', sale: 'Sale', all: 'Shop All' };

export default function Shop({ preset = {} }) {
  const f = useShopFilters(preset);
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState(null);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const filterBtnRef = useRef(null);
  useEffect(() => { api('/categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);
  useEffect(() => {
    let alive = true; setPending(true);
    api(`/products?${f.queryString}&limit=50`).then((d) => { if (alive) setProducts(d.products); }).catch(() => { if (alive) setProducts([]); }).finally(() => { if (alive) setPending(false); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => { alive = false; };
  }, [f.queryString]);
  const visible = useMemo(() => (applyClientFacets(products, f) || []).slice(0, 50), [products, f]);
  const activeCat = cats.find((c) => c.slug === f.category);
  const meta = activeCat ? activeCat.name : TITLES[preset.key] || (f.get('q') ? `"${f.get('q')}"` : TITLES.all);
  const count = visible?.length ?? null;
  const activeFilterCount = f.activeCount;
  return (
    <div style={{ fontFamily: "'Archivo', system-ui, sans-serif", background: '#FFFFFF', minHeight: '100vh' }}>
      <Seo title={`${meta}${f.gender?' — '+f.gender.charAt(0).toUpperCase()+f.gender.slice(1):''}`} description={`Shop premium ${meta.toLowerCase()}. Made in Pakistan.`} canonical={window.location?.pathname||'/shop'} />
      <div className="px-4 md:px-8 lg:px-12">
        <div className="flex items-baseline justify-between pt-8 pb-2">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[28px] md:text-[32px] font-light text-[#0E0E0E] tracking-tight">{meta}</h1>
            {count !== null && <span className="text-[13px] text-[#6E6E6B] tabular-nums">{count} product{count===1?'':'s'}</span>}
          </div>
          {activeFilterCount > 0 && <button onClick={f.clearAll} className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.10em] text-[#6E6E6B] hover:text-[#0E0E0E]">Clear all <X size={12} /></button>}
        </div>
        <div className="flex items-center justify-between border-b border-[#E3E2DF] pb-3 mb-6">
          <button ref={filterBtnRef} onClick={() => setSheetOpen(true)} className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.10em] text-[#0E0E0E] hover:opacity-60">
            <SlidersHorizontal size={14} /> Filter and Sort
            {activeFilterCount > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0E0E0E] px-1.5 text-[10px] font-bold text-white">{activeFilterCount}</span>}
          </button>
          <div className="flex items-center gap-4">
            <div className="relative">
              <select value={f.sort} onChange={(e) => f.setOne('sort', e.target.value, { replace: true })}
                className="appearance-none bg-transparent pr-5 text-[12px] font-medium uppercase tracking-[0.10em] text-[#0E0E0E] outline-none cursor-pointer">
                {[['popular','Featured'],['newest','Newest'],['price-asc','Price: Low to High'],['price-desc','Price: High to Low']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
        <ActiveChips chips={f.chips} onRemove={f.removeChip} onClearAll={f.clearAll} className="mb-4" />
        {products === null ? <ProductGridSkeleton /> : count === 0 ? (
          <div><EmptyState icon={SearchX} title="Nothing matches those filters" description="Try removing one or clear them all." onAction={f.clearAll} actionLabel="Clear all filters" />
            <ActiveChips chips={f.chips} onRemove={f.removeChip} onClearAll={f.clearAll} className="justify-center mt-4" /></div>
        ) : (
          <div aria-busy={pending||undefined} className={`grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4 transition-opacity duration-300 ${pending?'opacity-50':'opacity-100'}`}>
            {visible.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}
      </div>
      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onReset={f.clearAll}
        catList={f.gender ? cats.filter((c) => c.gender === f.gender) : cats} f={f} resultCount={count} returnFocusTo={filterBtnRef} />
    </div>
  );
}
