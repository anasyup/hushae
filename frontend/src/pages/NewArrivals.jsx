import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import Seo from '../components/Seo';
import { ProductGridSkeleton } from '../components/Skeletons';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import FilterSheet from './shop/FilterSheet';
import { fetchCats } from '../lib/catalogue';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';

/* ============================================================================
 * NEW ARRIVALS PAGE — the client's New Arrivals reference.
 *   · centred editorial header (Collection '26 · NEW ARRIVALS · description)
 *   · centred category tabs (ALL / WOMEN / MEN / LOUNGEWEAR) with underline
 *   · 'N Products' + Filters (opens the real filter sheet)
 *   · grid of the reference's EXACT product card (4/5 image, black 'NEW'
 *     badge top-right, title -> colour dots -> price) with TWO Versace-style
 *     editorial banners spanning 2 cols × 2 rows
 *   · Show More (+8) · newsletter sign-up
 * ========================================================================== */

const TABS = ['ALL', 'WOMEN', 'MEN', 'LOUNGEWEAR'];

const inLoungewear = (p) =>
  /(lounge|sleepwear|slip|cami|robe)/i.test(String(p.categorySlug || ''));

const matches = (p, tab) => {
  if (tab === 'ALL') return true;
  if (tab === 'WOMEN') return p.gender === 'women';
  if (tab === 'MEN') return p.gender === 'men';
  if (tab === 'LOUNGEWEAR') return inLoungewear(p);
  return true;
};

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

const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '').toUpperCase();

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="100%" height="100%" fill="#EFECE6"/></svg>');

export default function NewArrivalsPage() {
  const f = useShopFilters({ key: 'new', sort: 'newest' });
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState(null);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(12);
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const filterBtnRef = useRef(null);

  useEffect(() => { fetchCats().then(setCats); }, []);

  useEffect(() => {
    let alive = true; setPending(true); setVisibleCount(12);
    api(`/products?${f.queryString}&newArrival=true&limit=24`)
      .then((d) => { if (alive) { setProducts(d.products); setPending(false); } })
      .catch(() => { if (alive) setPending(false); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => { alive = false; };
  }, [f.queryString]); // eslint-disable-line

  const tabbed = useMemo(() => {
    const visible = applyClientFacets(products, f) || [];
    return activeTab === 'ALL' ? visible : visible.filter((p) => matches(p, activeTab));
  }, [products, f, activeTab]);

  const productCount = tabbed.length;

  /* Interleave banners after the 2nd and 6th items */
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
    <div className="w-full bg-[#FAF8F5] px-4 pb-24 pt-28 font-sans text-[#111111] sm:px-6 lg:px-8">
      <Seo title="New Arrivals | HUSHAE"
        description="Fresh from the studio — the latest drops, here first. Premium innerwear made in Pakistan, finished to an international standard."
        canonical="/new" />

      {/* ── Centred editorial header ── */}
      <div className="mx-auto mb-10 max-w-2xl space-y-2 text-center">
        <span className="block text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
          Collection &rsquo;26
        </span>
        <h1 className="font-serif text-3xl font-normal uppercase tracking-[0.1em] lg:text-5xl">
          New Arrivals
        </h1>
        <p className="mx-auto max-w-md text-[11px] leading-relaxed tracking-wider text-neutral-500">
          Second-skin essentials for the new season — engineered in Pakistan,
          finished to an international standard.
        </p>
      </div>

      {/* ── Centred tabs ── */}
      <div className="no-scrollbar mx-auto mb-6 flex items-center justify-center gap-8 overflow-x-auto border-b border-neutral-300/60 pb-4">
        {TABS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveTab(cat)}
            className={`relative whitespace-nowrap pb-2 text-[11px] font-medium uppercase tracking-[0.2em] transition-all ${
              activeTab === cat
                ? 'font-semibold text-black after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-full after:bg-black after:content-[""]'
                : 'text-neutral-400 hover:text-black'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Count + Filters ── */}
      <div className="mx-auto mb-8 flex max-w-[1400px] items-center justify-between text-[11px] uppercase tracking-[0.15em] text-neutral-500">
        <span>{productCount} {productCount === 1 ? 'Product' : 'Products'}</span>
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

      {/* ── Grid ── */}
      {products === null ? (
        <ProductGridSkeleton count={8} />
      ) : nodes.length === 0 ? (
        <p className="py-16 text-center text-[12px] uppercase tracking-[0.2em] text-neutral-400">
          No products in this edit yet.
        </p>
      ) : (
        <div className={`mx-auto grid max-w-[1400px] auto-rows-[minmax(0,auto)] grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 ${pending ? 'opacity-50' : 'opacity-100'} transition-opacity duration-300`}>
          {nodes.map((n) =>
            n.type === 'banner' ? (
              /* Versace-style editorial banner — 2 cols × 2 rows */
              <Link
                key={n.key}
                to={n.banner.href}
                className="group relative col-span-1 row-span-2 min-h-[520px] overflow-hidden bg-neutral-200 sm:col-span-2"
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
                  <h3 className="font-serif text-xl uppercase tracking-widest lg:text-3xl">
                    {n.banner.title}
                  </h3>
                  <span className="inline-flex items-center gap-2 border-b border-white pb-1 text-[10px] font-semibold uppercase tracking-[0.25em] transition hover:opacity-80">
                    <span>{n.banner.subtitle}</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ) : (
              <NewArrivalCard key={n.key} product={n.product} />
            ),
          )}
        </div>
      )}

      {/* ── Show More ── */}
      {hasMore && (
        <div className="mt-16 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((v) => v + 8)}
            className="border border-neutral-400 px-8 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-colors hover:border-black hover:bg-black hover:text-white"
          >
            Show More
          </button>
        </div>
      )}

      {/* ── Newsletter ── */}
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

      {/* ── Filter sheet ── */}
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

/* ════════════════════════════════════════════════════════════════════════
 * NewArrivalCard — the reference's EXACT card:
 *   · 4/5 image on #EFECE6, hover scale
 *   · solid BLACK square 'NEW' badge top-right (when new arrival)
 *   · title (11px semibold tracking-wider uppercase)
 *   · colour dots BELOW the title (2.5px, bordered)
 *   · price — original struck first, then new price in bold
 * ========================================================================= */
function NewArrivalCard({ product: p }) {
  if (!p) return null;
  const images = (p.images || []).map((i) => (typeof i === 'string' ? i : i?.url)).filter(Boolean);
  const img = images[0] || FALLBACK;
  const name = displayName(p.name) || 'Untitled';
  const slug = p.slug;
  const onSale = isOnSale(p);
  const colors = (p.colors || []).filter((c) => c && c.hex).slice(0, 4);
  const badge = p.isNewArrival === true ? 'New' : p.isBestSeller === true ? 'Best Seller' : null;

  return (
    <Link to={`/product/${slug}`} className="group flex cursor-pointer flex-col">
      {/* Image + black square badge top-right */}
      <div className="relative mb-3 aspect-[4/5] w-full overflow-hidden bg-[#EFECE6]">
        <img
          src={img}
          alt={name}
          loading="lazy"
          onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        {badge && (
          <span className="absolute right-2 top-2 bg-black px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white">
            {badge}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-semibold uppercase leading-tight tracking-wider text-[#111111]">
          {name}
        </h3>

        {colors.length > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {colors.map((c) => (
              <span
                key={c.name || c.hex}
                className="inline-block h-2.5 w-2.5 rounded-full border border-neutral-300"
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1 text-[11px]">
          {onSale && p.compareAtPrice > p.price && (
            <span className="font-normal text-neutral-400 line-through">{pkr(p.compareAtPrice)}</span>
          )}
          <span className="font-bold text-black">{pkr(p.price)}</span>
        </div>
      </div>
    </Link>
  );
}
