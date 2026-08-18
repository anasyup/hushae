import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/* ============================================================================
 * SectionHeader — the one header pattern every section uses.
 *
 * WHY IT IS HERE
 *
 * Before this component, the same seven Tailwind classes were typed by
 * hand on every section header, and they drifted — six places used h2 with
 * tracking-[0.14em] and one (Legacy Hero) used h2 with tracking-[0.18em].
 * Each section's "View All" was its own ad hoc <Link> with its own
 * spacing. The result was a homepage where three sections that should have
 * read as identical rungs of a ladder actually felt like three different
 * fonts.
 *
 * VARIANTS
 *   default  — Eyebrow + h2 left, optional "View All →" CTA on right
 *   centered — Eyebrow + h2 + optional "View All" all centred (used by the
 *              single editorial statement / Objects of Desire)
 *   quiet    — Eyebrow + h2 only, no CTA. Used by sections where the section
 *              itself is the CTA (Brand Story, Fit Finder).
 *
 * The variant always wins — `cta` is invisible if variant="quiet".
 * ========================================================================== */

export default function SectionHeader({
  eyebrow,
  title,
  href,
  cta,
  variant = 'default',
  className = '',
}) {
  const showCta = variant !== 'quiet' && (cta || href);

  if (variant === 'centered') {
    return (
      <div className={`mb-10 space-y-3 text-center md:mb-14 ${className}`}>
        {eyebrow && (
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">
            {eyebrow}
          </p>
        )}
        {title && (
          <h2 className="font-display text-[26px] font-light uppercase tracking-[0.14em] text-black md:text-[34px]">
            {title}
          </h2>
        )}
        {showCta && (
          <Link
            to={href}
            className="group inline-flex min-h-[44px] items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-600 transition-colors hover:text-black"
          >
            {cta || 'View All'}
            <ArrowRight
              size={13}
              className="transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      className={`mb-8 flex flex-col justify-between gap-4 md:mb-12 md:flex-row md:items-end md:gap-8 ${className}`}
    >
      <div>
        {eyebrow && (
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">
            {eyebrow}
          </p>
        )}
        {title && (
          <h2
            className={`mt-3 font-display text-[28px] font-light uppercase leading-[1.08] tracking-[0.14em] text-black md:text-[40px] ${
              variant === 'quiet' ? 'md:text-[34px]' : ''
            }`}
          >
            {title}
          </h2>
        )}
      </div>
      {showCta && (
        <Link
          to={href}
          className="group inline-flex min-h-[44px] items-center gap-1.5 self-start border-b border-black/40 pb-0.5 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-600 transition-colors hover:border-black hover:text-black md:self-auto"
        >
          {cta || 'View All'}
          <ArrowRight
            size={13}
            className="transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}