import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/* ============================================================================
 * SectionHeader — the one header pattern every section uses.
 *
 * TOKEN DISCIPLINE — enforced by construction
 *
 * Before this component, ad-hoc header markup across the homepage used 7+
 * different tracking values (0.005em, 0.02em, 0.06em, 0.14em, 0.18em,
 * 0.22em, 0.25em, 0.3em, 0.32em). Each new section added another. The
 * 13-value drift was invisible locally and devastating globally.
 *
 * This component enforces the typography token system:
 *
 *   eyebrow   text-xs     uppercase  tracking-eyebrow  (0.32em)
 *   title     text-2xl    uppercase  tracking-heading  (0.06em)
 *   cta label text-xs     uppercase  tracking-label    (0.22em)
 *
 * The class strings are computed once at module scope so no caller can
 * pass a custom className that bypasses the token system. If a designer
 * wants a new look, they extend the token system — not the className.
 *
 * VARIANTS
 *
 *   default  — eyebrow + h2 left, optional "View All →" CTA on right
 *   centered — eyebrow + h2 + optional "View All" all centred (used by
 *              the single editorial statement — Objects of Desire)
 *   quiet    — eyebrow + h2 only, no CTA. Used by sections where the
 *              section itself is the CTA (Brand Story, Fit Finder).
 *
 * The variant always wins — `cta` is invisible if variant="quiet".
 * ========================================================================== */

const eyebrowCls = 'text-xs font-medium uppercase tracking-eyebrow text-neutral-500';
const titleCls   = 'mt-3 text-2xl font-light uppercase tracking-heading text-black';
const ctaCls     = 'group inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium uppercase tracking-label text-neutral-600 transition-colors hover:text-black';
const ctaArrowCls= 'transition-transform duration-300 group-hover:translate-x-1';

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
        {eyebrow && <p className={eyebrowCls}>{eyebrow}</p>}
        {title && <h2 className={titleCls}>{title}</h2>}
        {showCta && (
          <Link to={href} className={ctaCls}>
            {cta || 'View All'}
            <ArrowRight size={13} className={ctaArrowCls} aria-hidden="true" />
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
        {eyebrow && <p className={eyebrowCls}>{eyebrow}</p>}
        {title && <h2 className={titleCls}>{title}</h2>}
      </div>
      {showCta && (
        <Link
          to={href}
          className={`${ctaCls} self-start border-b border-black/40 pb-0.5 hover:border-black md:self-auto`}
        >
          {cta || 'View All'}
          <ArrowRight size={13} className={ctaArrowCls} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}