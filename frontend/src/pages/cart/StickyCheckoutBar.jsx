import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { pkr } from '../../lib/format';

/* ============================================================================
 * HUSHAE StickyCheckoutBar — Mobile Sticky Bag Bar
 * ========================================================================== */

export default function StickyCheckoutBar({ watchRef, pricing, cfg, blocked }) {
  const [show, setShow] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    const el = watchRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([e]) => setShow(!e.isIntersecting),
      { rootMargin: '0px 0px -60px 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [watchRef]);

  const hidden = !show || pricing.count === 0;

  return (
    <div
      ref={barRef}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#EAEAEA] bg-[#FFFFFF]/95 backdrop-blur-md transition-transform duration-300 ease-out md:hidden font-sans ${
        hidden ? 'pointer-events-none translate-y-full' : 'translate-y-0'
      }`}
      aria-hidden={hidden}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-light">
            Total ({pricing.count})
          </p>
          <p className="text-base font-medium text-black tabular-nums">{pkr(pricing.total)}</p>
        </div>

        {blocked ? (
          <span className="rounded-full bg-red-100 px-6 py-2.5 text-xs font-medium text-red-800">
            Fix items
          </span>
        ) : (
          <Link
            to="/checkout"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#000000] px-7 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#FFFFFF] shadow-md hover:bg-neutral-800 transition-colors"
          >
            <span>Checkout</span>
            <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </div>
  );
}
