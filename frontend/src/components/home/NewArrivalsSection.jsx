import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import LuxuryProductCard from './LuxuryProductCard';

/* ============================================================================
 * NEW ARRIVALS — the house's new-season section (client reference).
 * Editorial header (season eyebrow + serif UPPERCASE title), category tabs
 * with an underline on the active one, a VIEW ALL link, and a luxury
 * 4-column grid of LuxuryProductCard. Filtering uses real product fields
 * (gender / categorySlug). Products come from the home page's data fetch.
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

export default function NewArrivalsSection({ products = [] }) {
  const [activeTab, setActiveTab] = useState('ALL');
  const list = (products || []).filter(Boolean);

  const filtered = useMemo(
    () => (activeTab === 'ALL' ? list : list.filter((p) => matches(p, activeTab))),
    [activeTab, list],
  );

  const show = filtered.slice(0, 8);

  if (!list.length) return null;

  return (
    <section className="w-full px-4 py-20 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1600px]">
        {/* Editorial header */}
        <div className="mb-12 flex flex-col justify-between border-b border-neutral-300/60 pb-8 lg:flex-row lg:items-end">
          <div>
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
              Autumn / Winter &rsquo;26
            </span>
            <h2 className="font-serif text-3xl font-normal uppercase tracking-[0.08em] text-[#111111] lg:text-4xl">
              New Arrivals
            </h2>
          </div>

          <div className="mt-6 flex flex-col justify-between gap-6 sm:flex-row sm:items-center lg:mt-0">
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

            <Link
              to="/new"
              className="group flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-black transition-opacity hover:opacity-60"
            >
              <span>View All</span>
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Luxury grid */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {show.map((p) => (
            <LuxuryProductCard key={p._id || p.slug} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
