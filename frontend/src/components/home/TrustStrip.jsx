import { Package, ShieldCheck, RotateCcw, Truck } from 'lucide-react';

/* ============================================================================
 * TrustStrip — four permanent brand promises, one quiet row.
 *
 * Trust signals live or die on placement. They should not announce
 * themselves; they should sit at the seam between sections where a shopper
 * is already weighing whether to proceed. A first-position strip right under
 * the hero reads as a hedge; a third-position strip after the first set of
 * product cards reads as proof.
 *
 * Four promises as four tracked-caps microcopy lines with mono-icons. White
 * background, hairline dividers between cells, no badges, no colour. Mobile
 * renders 2x2; on lg they spread to one row. Zero images, so the section
 * adds nothing to the Largest Contentful Paint budget. */

const PROMISES = [
  { icon: Truck,        label: 'Free shipping over PKR 4,999' },
  { icon: Package,      label: 'Discreet packaging — always' },
  { icon: RotateCcw,    label: '14-day easy exchange' },
  { icon: ShieldCheck,  label: 'Cash on delivery nationwide' },
];

export default function TrustStrip() {
  return (
    <section
      aria-label="Brand promises"
      className="border-y border-[#e5e5e5] bg-white"
    >
      <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-y-4 px-5 py-5 md:grid-cols-4 md:gap-y-0 md:px-8 md:py-6">
        {PROMISES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center justify-center gap-3 text-xs font-medium uppercase tracking-label text-black md:justify-start md:gap-3 md:tracking-label"
          >
            <Icon
              size={18}
              strokeWidth={1.4}
              className="shrink-0 text-black"
              aria-hidden="true"
            />
            <span className="text-center md:text-left">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}