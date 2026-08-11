import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes } from 'lucide-react';
import { api } from '../api/client';
import CollectionCard from '../components/CollectionCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import Seo from '../components/Seo';

/* ============================================================================
 * Public /collection/:slug page — exact client reference layout.
 *   · 1600px container, simple 32px uppercase header + subtitle
 *   · sticky filter bar (Filter & Refine + item count / sort select)
 *   · 4/3/2-col grid of CollectionCard
 * Filtering is client-side over the fetched collection list (size + colour).
 * ========================================================================== */

/* Filter & Refine icon — exact SVG from the client reference (14px, stroke 2). */
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

export default function Collection() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [sort, setSort] = useState('featured');
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterBtnRef = useRef(null);

  useEffect(() => {
    setData(null); setErr(false); setSort('featured'); setSizes([]); setColors([]); setFilterOpen(false);
    api(`/collections/${slug}`)
      .then(setData)
      .catch(() => setErr(true));
  }, [slug]);

  if (err) {
    return (
      <div className="container-page py-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#F0F0F0] text-[#696969]"><Boxes size={22} /></span>
        <h1 className="mt-6 text-3xl font-medium uppercase tracking-[0.04em] text-[#111111]">Collection Not Found</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#696969]">The collection you're looking for may have been renamed or removed.</p>
        <Link to="/shop" className="btn-primary mt-8">Browse all products</Link>
      </div>
    );
  }
  if (!data) return (
    <div className="mx-auto max-w-[1600px] px-5 py-10 md:px-[30px]">
      <div className="skeleton mb-6 h-16 w-full max-w-md" />
      <ProductGridSkeleton count={8} />
    </div>
  );

  const { collection: c, products } = data;

  const allSizes = useMemo(() => [...new Set(products.flatMap((p) => p.sizes || []))], [products]);
  const allColors = useMemo(() => {
    const seen = new Map();
    products.forEach((p) => (p.colors || []).forEach((col) => { if (!seen.has(col.name)) seen.set(col.name, col); }));
    return [...seen.values()];
  }, [products]);

  const visible = useMemo(() => {
    let list = [...products];
    if (sizes.length) list = list.filter((p) => (p.sizes || []).some((s) => sizes.includes(s)));
    if (colors.length) list = list.filter((p) => (p.colors || []).some((col) => colors.includes(col.name)));
    if (sort === 'price-asc') list.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === 'price-desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sort === 'newest') list.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
    return list;
  }, [products, sort, sizes, colors]);

  const activeFilterCount = sizes.length + colors.length;
  const toggle = (set, v) => set((xs) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]));
  const clearAll = () => { setSizes([]); setColors([]); };

  return (
    <div className="bg-white font-sans text-[#111111]" style={{ minHeight: '100vh' }}>
      <Seo
        title={c.name}
        description={c.description || `Shop the ${c.name} collection at HUSHAE — curated pieces for every moment.`}
        image={c.image}
        canonical={`/collection/${c.slug}`}
      />

      <div className="mx-auto max-w-[1600px] px-5 pb-20 pt-10 md:px-[30px]">
        {/* ═══ 1. HEADER — title + subtitle ═════════════════════════════ */}
        <div className="mb-[30px]">
          <h1 className="mb-2 text-[26px] font-normal uppercase leading-tight tracking-[-0.5px] text-[#111111] md:text-[32px]">
            {c.name}
          </h1>
          {c.description && <p className="text-[13px] text-[#666666]">{c.description}</p>}
        </div>

        {/* ═══ 2. FILTER BAR — sticky below header ═════════════════════ */}
        <div className="sticky top-[44px] z-[90] -mx-5 mb-10 border-y border-[#e5e5e5] bg-white px-5 lg:top-[65px] md:-mx-[30px] md:px-[30px]">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-5">
              <div className="relative">
                <button
                  ref={filterBtnRef}
                  onClick={() => setFilterOpen((o) => !o)}
                  aria-expanded={filterOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.5px] text-[#111111] hover:opacity-60"
                >
                  <FilterIcon />
                  Filter &amp; Refine
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Client-side filter popover */}
                {filterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} aria-hidden="true" />
                    <div className="absolute left-0 top-full z-20 mt-3 w-[300px] border border-[#e5e5e5] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#111111]">Filter &amp; Refine</p>
                        {activeFilterCount > 0 && (
                          <button onClick={clearAll} className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#777777] hover:text-[#111111]">
                            Clear all
                          </button>
                        )}
                      </div>
                      {allSizes.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#999999]">Size</p>
                          <div className="flex flex-wrap gap-1.5">
                            {allSizes.map((s) => (
                              <button key={s} type="button" onClick={() => toggle(setSizes, s)}
                                className={`min-w-[34px] border px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] transition-colors ${sizes.includes(s) ? 'border-[#111111] bg-[#111111] text-white' : 'border-[#dddddd] text-[#111111] hover:border-[#111111]'}`}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {allColors.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#999999]">Colour</p>
                          <div className="flex flex-wrap gap-2">
                            {allColors.map((col) => (
                              <button key={col.name} type="button" onClick={() => toggle(setColors, col.name)} title={col.name}
                                className={`h-6 w-6 rounded-full border transition ${colors.includes(col.name) ? 'border-[#111111] ring-1 ring-[#111111] ring-offset-2' : 'border-[#dddddd]'}`}
                                style={{ backgroundColor: col.hex || '#EEEEEE' }} />
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => setFilterOpen(false)}
                        className="mt-5 w-full border border-[#111111] py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                      >
                        Show {visible.length} item{visible.length === 1 ? '' : 's'}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <span className="text-[12px] text-[#777777]">{visible.length} Item{visible.length === 1 ? '' : 's'}</span>
            </div>

            <div className="flex items-center gap-4">
              <label className="sr-only" htmlFor="collection-sort">Sort products</label>
              <select
                id="collection-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="cursor-pointer bg-transparent text-[12px] font-medium uppercase tracking-[0.5px] text-[#111111] outline-none"
              >
                <option value="featured">Sort By: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </div>
          </div>
        </div>

        {/* ═══ 3. GRID ════════════════════════════════════════════════ */}
        {visible.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Boxes size={26} className="mb-3 text-[#C9A96E]" />
            <p className="text-sm text-[#696969]">No pieces match those filters.</p>
            <button onClick={clearAll} className="btn-outline mt-6">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 md:gap-x-5 md:gap-y-[30px] lg:grid-cols-4 lg:gap-x-5">
            {visible.map((p) => <CollectionCard key={p._id} product={p} />)}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[#777777] transition hover:text-[#111111]">
            <ArrowLeft size={13} /> Continue browsing all
          </Link>
        </div>
      </div>
    </div>
  );
}
