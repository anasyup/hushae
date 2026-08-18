import LuxuryProductCard from './LuxuryProductCard';
import SectionHeader from '../SectionHeader';
import { PRODUCT_GRID } from '../../lib/productGrid';

/* ============================================================================
 * NEW ARRIVALS — the house's quiet editorial section.
 *
 * Luxury = restraint. No tabs, no sort dropdown, no loud controls — just:
 *   1. An editorial header (SectionHeader — same primitive as everywhere)
 *   2. An airy grid of LuxuryProductCard
 *
 * The newest drops come first (the home fetch sorts by createdAt desc).
 * ========================================================================== */

export default function NewArrivalsSection({ products = [] }) {
  // products=null means loading — parent shows skeleton instead
  if (!products) return null;
  const list = products.filter(Boolean);
  const show = list.slice(0, 10);

  if (!list.length) return null;

  return (
    <section className="w-full bg-white pb-12 md:pb-16">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8">
        <SectionHeader
          eyebrow="The New In"
          title="New Arrivals"
          href="/new"
          cta="View All"
        />
      </div>

      {/* Hairline grid — full-bleed sale register */}
      <div className={`mt-10 ${PRODUCT_GRID}`}>
        {show.map((p) => (
          <LuxuryProductCard key={p._id || p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}