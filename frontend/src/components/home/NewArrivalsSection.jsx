import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import LuxuryProductCard from './LuxuryProductCard';

/* ============================================================================
 * NEW ARRIVALS — the house's "New In" section (Marni / Chloé / D&G register).
 *
 * Structure (matches the luxury houses' New-In pages):
 *   1. Editorial header — season eyebrow + serif UPPERCASE title, and the
 *      live item count on the right.
 *   2. FILTER & SORT toolbar — category tabs (ALL / WOMEN / MEN / LOUNGEWEAR)
 *      with an underline on the active tab, and a minimal sort select
 *      (Newest · Price Low→High · Price High→Low) with a hairline rule.
 *   3. Luxury 4-column grid of LuxuryProductCard (hover crossfade, quick-add
 *      sizes, wishlist, badges).
 *   4. "View all" editorial link to /new.
 *
 * Everything filters/sorts REAL product data (gender, categorySlug, price).
 * ========================================================================== */

const TABS = ['ALL', 'WOMEN', 'MEN', 'LOUNGEWEAR'];
const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
];

const inLoungewear = (p) =>
  /(lounge|sleepwear|slip|cami|robe)/i.test(String(p.categorySlug || ''));

const matches = (p, tab) => {
  if (tab === 'ALL') return true;
  if (tab === 'WOMEN') return p.gender === 'women';
  if (tab === 'MEN') return p.gender === 'men';
  if (tab === 'LOUNGEWEAR') return inLoungewear(p);
  return true;
};

const priceOf = (p) => Number(p?.price) || 0;

export default function NewArrivalsSection({ products = [] }) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [sort, setSort] = useState('newest');
  const list = (products || []).filter(Boolean);

  const visible = useMemo(() => {
    let out = activeTab === 'ALL' ? list : list.filter((p) => matches(p, activeTab));
    if (sort === 'price-asc') out = [...out].sort((a, b) => priceOf(a) - priceOf(b));
    if (sort === 'price-desc') out = [...out].sort((a, b) => priceOf(b) - priceOf(a));
    return out;
  }, [activeTab, sort, list]);

  const show = visible.slice(0, 10);

  if (!list.length) return null;

  return (
    <section className="w-full px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1600px]">
        {/* 1 — Editorial header + item count */}
        <div className="mb-10 flex flex-col justify-between border-b border-neutral-300/60 pb-8 lg:flex-row lg:items-end">
          <div>
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
              Autumn / Winter &rsquo;26 — The New In
            </span>
            <h2 className="font-serif text-3xl font-normal uppercase tracking-[0.08em] text-[#111111] lg:text-4xl">
              New Arrivals
            </h2>
          </div>
          <div className="mt-4 flex items-center gap-6 lg:mt-0">
            <p className="text-[11px] font-light uppercase tracking-[0.2em] text-neutral-400">
              {show.length} {show.length === 1 ? 'Item' : 'Items'}
            </p>
            <Link
              to="/new"
              className="group flex items-center gap-2 border-b border-black/50 pb-1 text-[11px] font-medium uppercase tracking-[0.25em] text-black transition-colors hover:border-black"
            >
              View All
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* 2 — Filter & Sort toolbar */}
        <div className="mb-12 flex flex-col justify-between gap-5 border-b border-neutral-300/60 pb-6 md:flex-row md:items-center">
          {/* Category tabs */}
          <div className="no-scrollbar flex items-center gap-6 overflow-x-auto">
            {TABS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveTab(cat)}
                className={`relative whitespace-nowrap pb-1 text-[11px] font-medium uppercase tracking-[0.2em] transition-all ${
                  activeTab === cat
                    ? 'font-semibold text-black after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-full after:bg-black after:content-[""]'
                    : 'text-neutral-400 hover:text-black'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
              Sort
            </span>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort products"
                className="cursor-pointer appearance-none border-b border-neutral-300 bg-transparent pb-1 pr-6 text-[11px] font-medium uppercase tracking-[0.15em] text-black outline-none transition-colors hover:border-black focus:border-black"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[8px] text-neutral-400"
              >
                ▾
              </span>
            </div>
          </div>
        </div>

        {/* 3 — Luxury grid */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {show.map((p) => (
            <LuxuryProductCard key={p._id || p.slug} product={p} />
          ))}
        </div>

      </div>
    </section>
  );
}
