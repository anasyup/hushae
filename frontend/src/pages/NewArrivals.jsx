import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { api } from '../api/client';
import Seo from '../components/Seo';
import RainsProductCard from '../components/home/RainsProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import FilterSheet from './shop/FilterSheet';
import { fetchCats } from '../lib/catalogue';

/* ============================================================================
 * NEW ARRIVALS PAGE — Rains-style editorial listing (client reference).
 *   1. TOP BAR — 'Collections' eyebrow, serif 'NEW ARRIVALS (N)', Filter
 *      (opens the real filter sheet) + Sort By select (real server sort).
 *   2. HERO EDITORIAL BANNER — full-bleed 60vh campaign with serif headline.
 *   3. PRODUCT GRID — LuxuryProductCard (unchanged design).
 *   4. INTERSPERSED EDITORIAL SPLIT — image + 'The Second Skin Edit'.
 *   5. SECOND PRODUCT GRID.
 * ========================================================================== */

const SORTS = [
  { id: 'newest', label: 'Featured' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
];

export default function NewArrivalsPage() {
  const f = useShopFilters({ key: 'new', sort: 'newest' });
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState(null);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shown, setShown] = useState(8);
  const filterBtnRef = useRef(null);

  useEffect(() => { fetchCats().then(setCats); }, []);

  useEffect(() => {
    let alive = true; setPending(true); setShown(8);
    api(`/products?${f.queryString}&newArrival=true&sort=newest&limit=24`)
      .then((d) => { if (alive) { setProducts(d.products); setPending(false); } })
      .catch(() => { if (alive) setPending(false); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => { alive = false; };
  }, [f.queryString]); // eslint-disable-line

  const visible = useMemo(() => applyClientFacets(products, f) || [], [products, f]);
  const count = visible.length;
  const shownList = visible.slice(0, shown);
  const hasMore = visible.length > shown;

  const sortLabel = SORTS.find((s) => s.id === f.get('sort'))?.label || 'Featured';

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-black">
      <Seo title="New Arrivals | HUSHAE"
        description="Fresh from the studio — the latest drops, here first. Premium innerwear made in Pakistan, finished to an international standard."
        canonical="/new" />

      {/* ── TOP BAR: Title + Filter & Sort ── */}
      <main className="pb-24 pt-[110px]">
        <section className="mb-8 flex flex-col justify-between gap-4 border-b border-neutral-200/60 px-6 pb-6 md:flex-row md:items-end lg:px-12">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
              Collections
            </span>
            <h1 className="mt-1 font-serif text-3xl font-light uppercase tracking-tight lg:text-4xl">
              New Arrivals <span className="ml-2 font-sans text-sm font-normal text-neutral-400">({count})</span>
            </h1>
          </div>

          <div className="flex items-center gap-6 text-xs font-medium uppercase tracking-widest">
            <button
              ref={filterBtnRef}
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-2 transition hover:opacity-60"
            >
              <SlidersHorizontal size={14} aria-hidden="true" /> Filter
            </button>
            <div className="relative">
              <select
                value={f.get('sort') || 'newest'}
                onChange={(e) => f.setOne('sort', e.target.value)}
                aria-label="Sort products"
                className="cursor-pointer appearance-none bg-transparent pr-5 text-xs font-medium uppercase tracking-widest outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{`Sort By: ${s.label}`}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2" aria-hidden="true">
                <ChevronDown size={14} />
              </span>
            </div>
          </div>
        </section>

        {/* ── HERO EDITORIAL BANNER ── */}
        <section className="mb-12 px-6 lg:px-12">
          <div className="relative flex h-[60vh] min-h-[420px] w-full items-end overflow-hidden bg-neutral-900 p-8 text-white lg:p-14">
            <img
              src="/images/campaign/qa/editorial-modern.jpg"
              alt="Editorial Banner"
              className="absolute inset-0 h-full w-full object-cover opacity-80"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(17,17,17,0.72) 0%, rgba(17,17,17,0.2) 55%, rgba(17,17,17,0) 100%)' }}
            />
            <div className="relative z-10 max-w-lg">
              <span className="mb-2 block text-[10px] uppercase tracking-[0.3em] opacity-90">
                Autumn / Winter Edition
              </span>
              <h2 className="mb-4 font-serif text-3xl font-light uppercase tracking-wider lg:text-5xl">
                The New Silhouette
              </h2>
              <p className="mb-6 text-xs font-light leading-relaxed tracking-wider opacity-80">
                Engineered for transition. Quiet, considered pieces — designed in
                Pakistan, finished to an international standard.
              </p>
              <Link
                to="/shop"
                className="inline-block border-b border-white pb-1 text-xs font-semibold uppercase tracking-[0.2em] transition hover:opacity-70"
              >
                Discover Collection
              </Link>
            </div>
          </div>
        </section>

        {/* ── PRODUCT GRID 1 ── */}
        <section className="mb-16 px-6 lg:px-12">
          {products === null ? (
            <ProductGridSkeleton count={4} />
          ) : shownList.length === 0 ? (
            <p className="py-16 text-center text-[12px] uppercase tracking-[0.2em] text-neutral-400">
              No products in this edit yet.
            </p>
          ) : (
            <div className={`grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 ${pending ? 'opacity-50' : 'opacity-100'} transition-opacity duration-300`}>
              {shownList.slice(0, 4).map((p) => (
                <RainsProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* ── INTERSPERSED EDITORIAL SPLIT ── */}
        <section className="mb-16 px-6 lg:px-12">
          <div className="grid grid-cols-1 items-center gap-8 bg-[#F2EFEA] p-6 lg:grid-cols-2 lg:p-12">
            <div className="aspect-[4/5] w-full overflow-hidden bg-neutral-200">
              <img
                src="/images/campaign/qa/hero-fabric.jpg"
                alt="The Second Skin Edit"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center px-4 lg:px-8">
              <span className="mb-2 text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                Featured Category
              </span>
              <h2 className="mb-4 font-serif text-2xl uppercase tracking-wider lg:text-4xl">
                The Second Skin Edit
              </h2>
              <p className="mb-6 text-xs leading-relaxed tracking-wide text-neutral-600">
                Featherweight layers with a barely-there finish — engineered in
                Pakistan, finished to an international standard.
              </p>
              <div>
                <Link
                  to="/shop"
                  className="inline-block border-b border-black pb-1 text-xs font-bold uppercase tracking-[0.2em] transition hover:opacity-60"
                >
                  Shop the Edit
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRODUCT GRID 2 ── */}
        <section className="px-6 lg:px-12">
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {shownList.slice(4).map((p) => (
              <RainsProductCard key={p._id} product={p} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-16 flex justify-center">
              <button
                type="button"
                onClick={() => setShown((v) => v + 8)}
                className="border border-neutral-400 px-10 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-colors hover:border-black hover:bg-black hover:text-white"
              >
                Show More ({visible.length - shown} left)
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ── FILTER SHEET ── */}
      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onReset={f.clearAll}
        catList={f.gender ? cats.filter((c) => c.gender === f.gender) : cats}
        f={f}
        resultCount={count}
        returnFocusTo={filterBtnRef}
      />
    </div>
  );
}
