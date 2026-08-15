import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import LuxuryProductCard from './LuxuryProductCard';

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
    <section className="w-full px-4 py-20 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1600px]">
        {/* ── Editorial header ── */}
        <div className="flex flex-col justify-between border-b border-neutral-300/60 pb-9 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-neutral-400">
              Autumn / Winter &rsquo;26 — The New In
            </p>
            <h2 className="mt-6 font-serif text-3xl font-normal uppercase leading-[1.1] tracking-[0.08em] text-[#111111] md:text-5xl">
              New Arrivals
            </h2>
          </div>

          <Link
            to="/new"
            className="group mt-7 inline-flex items-center gap-2 border-b border-black/50 pb-1 text-[11px] font-medium uppercase tracking-[0.25em] text-black transition-colors hover:border-black md:mt-0"
          >
            View All
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        {/* ── Luxury grid — cards unchanged ── */}
        <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-16 md:grid-cols-3">
          {show.map((p) => (
            <LuxuryProductCard key={p._id || p.slug} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
