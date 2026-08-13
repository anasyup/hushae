import { Link } from 'react-router-dom';

/* ============================================================================
 * NewArrivalsStory — editorial story module (Loewe / Valentino register).
 * A composed split: photography owns the left plate, the house's words stay
 * quiet on the right — eyebrow, serif heading, hairline, description, CTA.
 * ========================================================================== */

export default function NewArrivalsStory() {
  return (
    <section className="w-full bg-[#FAF8F5] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-[1600px] items-center gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
        {/* Image plate */}
        <div className="relative overflow-hidden bg-[#EFECE6]">
          <img
            src="/images/campaign/qa/editorial-modern.jpg"
            alt="The Second Skin Edit"
            loading="lazy"
            decoding="async"
            className="aspect-[4/5] w-full object-cover object-center"
          />
          <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-1.5 backdrop-blur-sm">
            <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-[#111111]">
              The Edit — Vol. 1
            </p>
          </div>
        </div>

        {/* Copy */}
        <div className="md:pl-2 lg:pl-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
            The Second Skin Edit
          </p>
          <h2 className="mt-6 font-serif text-3xl font-normal uppercase leading-[1.15] tracking-[0.08em] text-[#111111] md:text-4xl">
            Quiet,
            <br />
            Considered.
          </h2>

          <div className="mt-8 h-px w-12 bg-[#111111]/50" aria-hidden="true" />

          <p className="mt-8 max-w-md text-[14px] font-light leading-[2] text-neutral-600">
            Every piece in this drop is cut to disappear under everything you
            own — seams that sit flat, elastics that hold without pressing,
            fabrics that keep their shape wash after wash.
          </p>

          <div className="mt-10">
            <Link
              to="/shop"
              className="group inline-flex items-center gap-3 border-b border-black/50 pb-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-black transition-colors hover:border-black"
            >
              Explore the Edit
              <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
