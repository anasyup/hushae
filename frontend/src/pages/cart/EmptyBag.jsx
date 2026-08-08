import { Link } from 'react-router-dom';
import ProductRow from '../../components/ProductRow';
import TrustRow from './TrustRow';

/* ============================================================================
 * Empty bag.
 *
 * The illustration is inline SVG rather than an <img>: it is ~1 kB, needs no
 * request, and cannot arrive late and shift the page. It is aria-hidden — the
 * heading already says everything a screen reader needs.
 *
 * Recently viewed comes from local history, so an empty bag is still a way
 * back into the catalogue rather than a dead end.
 * ========================================================================== */
export default function EmptyBag({ cfg, recent = [], trending = [], loadingTrending = false }) {
  return (
    <>
      <div className="mx-auto grid max-w-md place-items-center px-4 py-sect-y text-center md:py-sect-y-lg">
        <svg
          viewBox="0 0 120 120" width="112" height="112" fill="none" aria-hidden="true"
          className="text-bronze"
        >
          <circle cx="60" cy="60" r="52" fill="#EFEAE3" />
          <path
            d="M38 46h44l-4.2 38.5a6 6 0 0 1-6 5.5H48.2a6 6 0 0 1-6-5.5L38 46Z"
            stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"
          />
          <path
            d="M50 46v-6a10 10 0 0 1 20 0v6"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
          />
          <path d="M52 62h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".55" />
        </svg>

        <h1 className="mt-7 font-display text-h2">{cfg.emptyTitle}</h1>
        <p className="mt-3 text-body text-ash">{cfg.emptyText}</p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
          <Link to={cfg.continueHref} className="btn-primary sm:px-10">{cfg.continueLabel}</Link>
          <Link to="/best" className="btn-outline sm:px-10">Best sellers</Link>
        </div>

        {cfg.showTrust && (
          <TrustRow items={cfg.trust} className="mt-10 w-full max-w-xs text-left" />
        )}
      </div>

      {recent.length > 0 && (
        <div className="mt-4 pb-4">
          <ProductRow eyebrow="Pick up where you left off" title="Recently viewed" products={recent} />
        </div>
      )}

      {/* Trending is fetched after paint, so its slot is reserved. Without the
          reservation the footer jumped 466px when the row landed — measured
          CLS 0.0380 on desktop. Heights are the measured rendered heights of
          the row at each breakpoint. */}
      {loadingTrending ? (
        <div className="mt-14 h-[398px] md:h-[466px]" aria-hidden="true" />
      ) : trending.length > 0 && (
        <div className="mt-14 pb-8">
          <ProductRow eyebrow="Loved right now" title="Trending at HUSHAE" products={trending} />
        </div>
      )}
    </>
  );
}
