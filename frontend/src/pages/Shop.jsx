import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchX } from 'lucide-react';
import { api } from '../api/client';
import CollectionCard from '../components/CollectionCard';
import LuxuryFilterBar from '../components/LuxuryFilterBar';
import { ProductGridSkeleton } from '../components/Skeletons';
import EmptyState from '../components/ui/EmptyState';
import Seo from '../components/Seo';
import useShopFilters, { applyClientFacets } from './shop/useShopFilters';
import FilterSheet from './shop/FilterSheet';
import { fetchCats } from '../lib/catalogue';
import { pictureSources } from '../lib/responsiveImage';

/* ============================================================================
 * HUSHAE Catalog / Category — EDITORIAL MAISON (Gucci / Givenchy register)
 *
 * Direction chosen by the merchant from three art-directed mockups:
 *   1. Full-bleed campaign hero — the category title lives INSIDE the
 *      photography (eyebrow + tracked title, bottom-centered, soft scrim)
 *   2. Warm cream canvas (#FBFAF8) below the hero — the page reads as an
 *      editorial spread, not a white utility screen
 *   3. Centered text-link category tabs (underline = active)
 *   4. Three-zone control bar: FILTERS · count · SORT BY
 *   5. Three-column gallery grid, centered metadata, deeper cream grounds
 * ========================================================================== */

const TITLES = {
  women: "Women's Collection",
  men: "Men's Collection",
  new: 'New Arrivals',
  best: 'Best Sellers',
  sale: 'Sale',
  all: 'The Collection',
};

/* Art-directed hero per page. Heights are FIXED per breakpoint so the band
   never shifts layout while the image decodes. */
const HERO = {
  women: { img: '/images/campaign/qa/cat-women.jpg', pos: 'center 30%' },
  men:   { img: '/images/campaign/qa/cat-men.jpg', pos: 'center 25%' },
  new:   { img: '/images/campaign/qa/editorial-modern.jpg', pos: 'center 35%' },
  best:  { img: '/images/campaign/qa/hero-fabric.jpg', pos: 'center 45%' },
  sale:  { img: '/images/campaign/qa/hero-new-1.jpg', pos: 'center 30%' },
  all:   { img: '/images/campaign/qa/hero-fabric.jpg', pos: 'center 45%' },
};

const GENDER_TABS = [
  { key: '', label: 'All' },
  { key: 'women', label: 'Women' },
  { key: 'men', label: 'Men' },
];

const REVEAL = 12;

const LINK_BASE =
  'inline-flex shrink-0 items-center whitespace-nowrap border-b pb-1.5 text-[11px] uppercase tracking-[0.2em] transition-colors duration-200';
const LINK_ON = 'border-[#111111] font-medium text-[#111111]';
const LINK_OFF = 'border-transparent font-normal text-[#6E6A63] hover:text-[#111111]';

export default function Shop({ preset = {} }) {
  const f = useShopFilters(preset);
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState(null);
  const [pending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shown, setShown] = useState(REVEAL);
  const filterBtnRef = useRef(null);

  useEffect(() => { fetchCats().then(setCats); }, []);

  useEffect(() => {
    let alive = true;
    setPending(true);
    setShown(REVEAL);
    api(`/products?${f.queryString}${preset.key === 'new' ? '&newArrival=true' : ''}${preset.key === 'sale' ? '&sale=true' : ''}`)
      .then((d) => { if (alive) { setProducts(d.products); setPending(false); } })
      .catch(() => { if (alive) setPending(false); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => { alive = false; };
  }, [f.queryString]);

  const visible = useMemo(() => applyClientFacets(products, f), [products, f]);
  const activeCat = cats.find((c) => c.slug === f.category);
  const fallbackCategoryName = f.category ? f.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  const title = activeCat ? activeCat.name : TITLES[preset.key] || fallbackCategoryName || (f.get('q') ? `"${f.get('q')}"` : TITLES.all);
  const count = visible?.length ?? null;

  const hero = activeCat
    ? HERO[activeCat.gender === 'men' ? 'men' : 'women']
    : HERO[preset.key] || HERO.all;

  const showGenderTabs = preset.key === 'sale' && !preset.gender;
  const navCats = useMemo(() => (f.gender ? cats.filter((c) => c.gender === f.gender) : cats), [cats, f.gender]);
  const visibleSlice = visible ? visible.slice(0, shown) : [];
  const hasMore = visible ? visible.length > shown : false;

  return (
    <div className="min-h-screen bg-white pt-[120px] font-sans text-[#111111] antialiased">
      <Seo
        title={`${title} — HUSHAE`}
        description={`Shop premium ${title.toLowerCase()} — innerwear made in Pakistan, finished to an international standard. COD nationwide, discreet packaging.`}
        canonical={typeof window !== 'undefined' ? window.location.pathname : '/shop'}
      />

      {/* ═══ 1. CAMPAIGN HERO — title inside the photography ══════════════ */}
      <section className="relative h-[240px] w-full overflow-hidden sm:h-[300px] md:h-[380px] xl:h-[440px]">
        <picture className="contents">
          {pictureSources(hero.img).map((s) => (
            <source key={s.type} type={s.type} srcSet={s.srcSet} sizes="100vw" />
          ))}
          <img
            src={hero.img}
            alt=""
            aria-hidden="true"
            sizes="100vw"
            loading="eager"
            fetchpriority="high"
            decoding="sync"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: hero.pos }}
          />
        </picture>
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,.05) 40%, rgba(0,0,0,.38) 100%)' }}
        />
        <div className="absolute inset-x-0 bottom-7 text-center text-white sm:bottom-9 md:bottom-12">
          <p className="text-[10px] font-normal uppercase tracking-[0.34em] opacity-90 md:text-[11px]">HUSHAE</p>
          <h1 className="mt-2.5 px-4 text-[24px] font-normal uppercase leading-tight tracking-[0.18em] sm:text-[32px] md:mt-3.5 md:text-[42px] md:tracking-[0.22em]">
            {title}
          </h1>
        </div>
      </section>

      {/* ═══ 2. CREAM EDITORIAL CANVAS ════════════════════════════════════ */}
      <div className="bg-[#FBFAF8] pb-24">
        {/* Gender switch (/sale) */}
        {showGenderTabs && (
          <div className="flex items-center justify-center gap-7 pt-8" role="group" aria-label="Department">
            {GENDER_TABS.map((t) => {
              const on = (f.get('gender') || '') === t.key;
              return (
                <button key={`g-${t.key}`} type="button" aria-pressed={on}
                  onClick={() => f.setOne('gender', t.key)}
                  className={`${LINK_BASE} ${on ? LINK_ON : LINK_OFF}`}>
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Category text links — centered when they fit, scrollable when not.
            The inner w-max + mx-auto wrapper is the safe centering pattern:
            justify-center on an overflowing flex container CLIPS the start. */}
        {navCats.length > 0 && (
          <nav
            aria-label="Categories"
            className={`no-scrollbar overflow-x-auto pb-8 ${showGenderTabs ? 'pt-4' : 'pt-8'}`}
          >
            <div className="mx-auto flex w-max items-center gap-6 px-6 md:gap-9">
              <button type="button" onClick={() => f.setOne('category', '')}
                className={`${LINK_BASE} ${!f.category ? LINK_ON : LINK_OFF}`}>
                View All
              </button>
              {navCats.map((c) => (
                <button key={c.slug} type="button"
                  onClick={() => f.setOne('category', f.category === c.slug ? '' : c.slug)}
                  className={`${LINK_BASE} ${f.category === c.slug ? LINK_ON : LINK_OFF}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </nav>
        )}

        {/* ═══ 3. THREE-ZONE CONTROL BAR ═══════════════════════════════ */}
        <LuxuryFilterBar
          count={count}
          f={f}
          onOpenFilters={() => setSheetOpen(true)}
          filterBtnRef={filterBtnRef}
        />

        {/* ═══ 4. GALLERY GRID — 3-col, centered meta, cream grounds ═══ */}
        <div className="mx-auto max-w-[1440px] px-5 pt-12 sm:px-8 md:px-12">
          {products === null ? (
            <ProductGridSkeleton count={6} />
          ) : count === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={SearchX}
                title="No pieces found"
                description="Try adjusting your filters or browse the complete collection."
                onAction={f.clearAll}
                actionLabel="View all products"
              />
            </div>
          ) : (
            <>
              <div
                aria-busy={pending || undefined}
                className={`grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity duration-300 md:grid-cols-3 md:gap-x-8 md:gap-y-14 ${
                  pending ? 'opacity-50' : 'opacity-100'
                }`}
              >
                {visibleSlice.map((p) => (
                  <CollectionCard key={p._id || p.slug} product={p} align="center" ground="#F1EFEA" />
                ))}
              </div>

              {hasMore && (
                <div className="flex w-full justify-center pt-16">
                  <button
                    type="button"
                    onClick={() => setShown((s) => s + REVEAL)}
                    className="flex h-12 w-full max-w-xs items-center justify-center border border-[#111111] bg-transparent text-[11px] font-medium uppercase tracking-[0.2em] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white disabled:opacity-50"
                  >
                    {pending ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filter Side Sheet (Full Facets Modal) */}
      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onReset={f.clearAll}
        catList={f.gender ? cats.filter((c) => c.gender === f.gender) : cats}
        f={f}
        resultCount={count ?? 0}
        returnFocusTo={filterBtnRef}
      />
    </div>
  );
}
