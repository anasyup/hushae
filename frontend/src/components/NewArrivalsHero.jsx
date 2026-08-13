/* ============================================================================
 * NewArrivalsHero — Calvin Klein minimal editorial header for /new.
 * CK's new-arrivals register: no big image hero — a quiet, typography-led
 * header on the page ground (ivory), a thin hairline, a one-line
 * description, and a row of minimal category quick-links (All / Women /
 * Men / Loungewear) with a hover underline. Restraint is the luxury.
 * ========================================================================== */

const QUICK_LINKS = ['All', 'Women', 'Men', 'Loungewear'];

export default function NewArrivalsHero({ count }) {
  return (
    <section className="w-full bg-[#FAF8F5]">
      <div className="mx-auto w-full max-w-[1600px] px-6 pt-12 md:px-12 md:pt-16">
        {/* Eyebrow */}
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
          Autumn / Winter &rsquo;26 — The New In
        </p>

        {/* Title — big, quiet, typography-led */}
        <h1 className="mt-6 font-serif text-4xl font-normal uppercase tracking-[0.06em] text-[#111111] md:text-6xl">
          New Arrivals
        </h1>

        {/* Hairline */}
        <div className="mt-8 h-px w-full bg-neutral-300/60" aria-hidden="true" />

        {/* Quick links + count */}
        <div className="flex flex-col justify-between gap-4 py-6 md:flex-row md:items-center">
          <nav
            aria-label="New arrivals quick links"
            className="no-scrollbar flex items-center gap-7 overflow-x-auto"
          >
            {QUICK_LINKS.map((label) => (
              <a
                key={label}
                href={label === 'All' ? '/new' : label === 'Women' ? '/new?gender=women' : label === 'Men' ? '/new?gender=men' : '/new?q=loungewear'}
                onClick={(e) => e.preventDefault()}
                className={`whitespace-nowrap border-b pb-1 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${
                  label === 'All'
                    ? 'border-black text-black'
                    : 'border-transparent text-neutral-500 hover:border-black hover:text-black'
                }`}
              >
                {label}
              </a>
            ))}
          </nav>

          <p className="shrink-0 text-[10px] font-medium uppercase tracking-[0.24em] text-neutral-400">
            {count || 0} {count === 1 ? 'Piece' : 'Pieces'}
          </p>
        </div>
      </div>
    </section>
  );
}
