import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import LuxuryProductCard from './LuxuryProductCard';
import { PRODUCT_GRID } from '../../lib/productGrid';

/* ============================================================================
 * NEW ARRIVALS — the house's quiet editorial section (LV / Celine register).
 *
 * Luxury = restraint. No tabs, no sort dropdown, no loud controls — just:
 *   1. An editorial header — small tracked eyebrow, large serif title,
 *      a hairline rule, and one quiet "View All →" link.
 *   2. An airy grid of LuxuryProductCard (unchanged design).
 *
 * The newest drops come first (the home fetch sorts by createdAt desc).
 * ========================================================================== */

export default function NewArrivalsSection({ products = [] }) {
  const list = (products || []).filter(Boolean);
  const show = list.slice(0, 10);

  if (!list.length) return null;

  return (
    <section className="w-full bg-white pb-12 md:pb-16">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8">
        {/* ── Editorial header — CK register: thin tracked caps, no rules ── */}
        <div className="flex flex-col justify-between pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
              The New In
            </p>
            <h2 className="mt-4 text-[28px] font-light uppercase leading-[1.08] tracking-[0.14em] text-[#111111] md:text-[44px]">
              New Arrivals
            </h2>
          </div>

          <Link
            to="/new"
            className="group mt-6 inline-flex min-h-[44px] items-center gap-2 border-b border-black/40 pb-0.5 text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-600 transition-colors hover:border-black hover:text-black md:mt-0"
          >
            View All
            <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ── Hairline grid — full-bleed sale register ── */}
      <div className={`mt-10 ${PRODUCT_GRID}`}>
        {show.map((p) => (
          <LuxuryProductCard key={p._id || p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}
