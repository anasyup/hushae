import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import Seo from '../components/Seo';
import LuxuryProductCard from '../components/home/LuxuryProductCard';
import { ProductGridSkeleton } from '../components/Skeletons';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import FilterSheet from './shop/FilterSheet';
import { fetchCats } from '../lib/catalogue';

/* ============================================================================
 * NEW ARRIVALS PAGE — Hermès editorial tone × Versace editorial tiles.
 *
 * Structure:
 *   1. HERMÈS-STYLE EDITORIAL HEADER — season eyebrow, large serif title,
 *      one-line description, hairline rule. No tabs, no loud controls.
 *   2. DISCREET BAR — 'N Products' + 'Filters' (opens the real filter sheet).
 *   3. AIRY GRID of LuxuryProductCard (unchanged design) with TWO Versace
 *      editorial banner tiles (2 cols × 2 rows, serif titles + arrow CTA).
 *   4. NEWSLETTER — 'Join the House of Hushae'.
 * ========================================================================== */

const BANNERS = [
  {
    id: 'banner-1',
    title: "Autumn Lookbook '26",
    subtitle: 'Shop the Look',
    image: '/images/campaign/qa/editorial-performance.jpg',
    href: '/shop',
  },
  {
    id: 'banner-2',
    title: 'Signature Essentials',
    subtitle: 'Discover More',
    image: '/images/campaign/qa/hero-fabric.jpg',
    href: '/best',
  },
];

export default function NewArrivalsPage() {
  const f = useShopFilters({ key: 'new', sort: 'newest' });
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState(null);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const filterBtnRef = useRef(null);

  useEffect(() => { fetchCats().then(setCats); }, []);

  useEffect(() => {
    let alive = true; setPending(true); setVisibleCount(12);
    api(`/products?${f.queryString}&newArrival=true&sort=newest&limit=24`)
      .then((d) => { if (alive) { setProducts(d.products); setPending(false); } })
      .catch(() => { if (alive) setPending(false); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => { alive = false; };
  }, [f.queryString]); // eslint-disable-line

  const tabbed = useMemo(() => applyClientFacets(products, f) || [], [products, f]);
  const productCount = tabbed.length;

  /* Interleave Versace banners after the 2nd and 6th items */
  const nodes = useMemo(() => {
    const out = [];
    tabbed.slice(0, visibleCount).forEach((p, i) => {
      out.push({ type: 'product', key: p._id, product: p });
      if (i === 1) out.push({ type: 'banner', key: BANNERS[0].id, banner: BANNERS[0] });
      if (i === 5) out.push({ type: 'banner', key: BANNERS[1].id, banner: BANNERS[1] });
    });
    return out;
  }, [tabbed, visibleCount]);

  const hasMore = tabbed.length > visibleCount;

  const subscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    api('/subscribers', { method: 'POST', body: { email: email.trim() } }).catch(() => {});
    setDone(true);
  };

  return (
    <div className="w-full bg-[#FAF8F5] px-4 pb-24 pt-24 font-sans text-[#111111] sm:px-6 lg:px-8">
      <Seo title="New Arrivals | HUSHAE"
        description="Fresh from the studio — the latest drops, here first. Premium innerwear made in Pakistan, finished to an international standard."
        canonical="/new" />

      {/* ── 1 · HERMÈS-STYLE EDITORIAL HEADER ── */}
      <div className="mx-auto max-w-[1400px]">
        <div className="border-b border-neutral-300/60 pb-10">
          <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-neutral-400">
            Autumn / Winter &rsquo;26 — The New In
          </p>
          <h1 className="mt-6 font-serif text-4xl font-normal uppercase leading-[1.08] tracking-[0.08em] text-[#111111] md:text-6xl">
            New Arrivals
          </h1>
          <p className="mt-7 max-w-md text-[13px] font-light leading-[1.9] tracking-wide text-neutral-500">
            Second-skin essentials for the new season — engineered in Pakistan,
            finished to an international standard.
          </p>
        </div>
      </div>

      {/* ── 2 · DISCREET BAR ── */}
      <div className="mx-auto mt-8 flex max-w-[1400px] items-center justify-between text-[11px] uppercase tracking-[0.15em] text-neutral-500">
        <span>{productCount} {productCount === 1 ? 'Piece' : 'Pieces'}</span>
        <button
          ref={filterBtnRef}
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 transition-colors hover:text-black"
        >
          Filters
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── 3 · GRID (cards + Versace banners) ── */}
      {products === null ? (
        <div className="mx-auto max-w-[1400px] pt-14"><ProductGridSkeleton count={8} /></div>
      ) : nodes.length === 0 ? (
        <p className="py-20 text-center text-[12px] uppercase tracking-[0.2em] text-neutral-400">
          No products in this edit yet.
        </p>
      ) : (
        <div className={`mx-auto mt-12 grid max-w-[1400px] auto-rows-[minmax(0,auto)] grid-cols-2 gap-x-6 gap-y-16 md:grid-cols-4 ${pending ? 'opacity-50' : 'opacity-100'} transition-opacity duration-300`}>
          {nodes.map((n) =>
            n.type === 'banner' ? (
              /* Versace editorial banner — 2 cols × 2 rows */
              <Link
                key={n.key}
                to={n.banner.href}
                className="group relative col-span-1 row-span-2 min-h-[520px] overflow-hidden bg-neutral-200 md:col-span-2"
              >
                <img
                  src={n.banner.image}
                  alt={n.banner.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" aria-hidden="true" />
                <div className="absolute bottom-8 left-8 space-y-2 text-white">
                  <h2 className="font-serif text-xl uppercase tracking-widest lg:text-3xl">
                    {n.banner.title}
                  </h2>
                  <span className="inline-flex items-center gap-2 border-b border-white pb-1 text-[10px] font-semibold uppercase tracking-[0.25em] transition hover:opacity-80">
                    <span>{n.banner.subtitle}</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ) : (
              <LuxuryProductCard key={n.key} product={n.product} />
            ),
          )}
        </div>
      )}

      {/* ── SHOW MORE ── */}
      {hasMore && (
        <div className="mt-16 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((v) => v + 8)}
            className="border border-neutral-400 px-10 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-colors hover:border-black hover:bg-black hover:text-white"
          >
            Show More
          </button>
        </div>
      )}

      {/* ── 4 · NEWSLETTER ── */}
      <div className="mx-auto mt-28 max-w-2xl border-t border-neutral-300/60 pt-16 text-center">
        <span className="mb-3 block text-[10px] uppercase tracking-[0.3em] text-neutral-400">
          Join the House of Hushae
        </span>
        <p className="mb-6 text-sm text-neutral-600">
          Sign up for early access to new drops and exclusive releases.
        </p>
        {done ? (
          <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#111111]">
            You&rsquo;re on the list.
          </p>
        ) : (
          <form
            onSubmit={subscribe}
            className="mx-auto flex max-w-sm items-center justify-center border-b border-black pb-2"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address *"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
            <button type="submit" aria-label="Subscribe" className="transition hover:opacity-60">
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>

      {/* ── BREADCRUMB ── */}
      <div className="mx-auto mt-16 flex max-w-[1400px] flex-wrap gap-6 border-t border-neutral-300/60 pt-6 text-[10px] uppercase tracking-[0.15em] text-neutral-400">
        <Link to="/" className="transition hover:text-black">Homepage</Link>
        <span>/</span>
        <Link to="/women" className="transition hover:text-black">Women</Link>
        <span>/</span>
        <span className="text-black">New Arrivals</span>
      </div>

      {/* ── FILTER SHEET ── */}
      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onReset={f.clearAll}
        catList={f.gender ? cats.filter((c) => c.gender === f.gender) : cats}
        f={f}
        resultCount={productCount}
        returnFocusTo={filterBtnRef}
      />
    </div>
  );
}
