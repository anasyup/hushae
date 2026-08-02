import { useEffect, useRef, useState } from 'react';
import { pkr } from '../../lib/format';
import Img from '../../components/Img';
import { CheckCircle2, Loader2 } from 'lucide-react';

/* ============================================================================
 * Sticky Add-to-bag / Buy Now bar.
 *
 * Appears once the in-page buy row scrolls out of view. Mobile dock stacks
 * directly above the MobileNav (with safe-area); desktop docks on a hairline
 * at top-0? No — bottom of viewport on mobile, top of viewport on desktop?
 * We keep the original behaviour (fixed bottom on mobile, fixed bottom on
 * desktop as a thin hairline strip) but add the Buy Now secondary action and
 * proper loading / added / disabled states so the sticky bar cannot disagree
 * with the main CTA row.
 *
 * The bar publishes its real height into --buy-bar-h so the Compare tray,
 * Toasts, WhatsApp and the MobileNav can stack on top instead of guessing.
 * ========================================================================== */
export default function StickyBuyBar({
  product,
  watchRef,
  size,
  color,
  needsSize,
  onAdd,
  onBuyNow,
  disabled,
  adding = false,
  added = false,
  thumb,
}) {
  const [show, setShow] = useState(false);
  const [pulse, setPulse] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    const el = watchRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        const past = entry.boundingClientRect.bottom < (entry.rootBounds?.top ?? 0) + 80;
        setShow(!entry.isIntersecting && past);
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [watchRef]);

  useEffect(() => {
    if (added) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [added]);

  /* Publish bar height for other docked elements. */
  useEffect(() => {
    const el = barRef.current;
    if (!el) return undefined;
    const root = document.documentElement;
    const publish = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) root.style.setProperty('--buy-bar-h', `${h}px`);
    };
    publish();
    let ro;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(publish); ro.observe(el); }
    window.addEventListener('resize', publish);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', publish);
      root.style.removeProperty('--buy-bar-h');
    };
  }, []);

  const onSale = product.compareAtPrice > product.price;
  const ready = needsSize ? !!size : true;
  const actionDisabled = disabled || adding;

  const addLabel = disabled
    ? 'Sold out'
    : adding ? 'Adding…'
      : added && pulse ? 'Added'
        : needsSize && !size ? 'Select a size'
          : 'Add to bag';

  return (
    <div
      ref={barRef}
      aria-hidden={!show}
      inert={!show ? '' : undefined}
      className={`fixed inset-x-0 border-y border-line bg-alabaster/95 shadow-e-3 backdrop-blur-xl transition-transform duration-base ease-standard motion-reduce:transition-none
                  bottom-[calc(53px+env(safe-area-inset-bottom))]
                  md:bottom-0 lg:border-y-0 lg:border-t lg:bg-alabaster/95 lg:shadow-none ${
        show ? 'translate-y-0' : 'pointer-events-none translate-y-[150%]'
      } pb-[max(0.75rem,env(safe-area-inset-bottom))]`}
      style={{ zIndex: 'var(--z-stickybar)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 pt-3 md:px-8 lg:gap-5 xl:max-w-[1360px] xl:px-10 2xl:max-w-[1560px] 2xl:px-14 3xl:max-w-shell 3xl:px-16">
        {thumb && (
          <span aria-hidden="true" className="hidden shrink-0 lg:block">
            <Img
              src={thumb}
              alt=""
              sizes="44px"
              width="44"
              height="55"
              className="h-14 w-11 rounded-control object-cover"
            />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-caption text-ash lg:text-body-sm lg:text-ink">{product.name}</p>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="text-body font-semibold tabular-nums text-obsidian lg:font-display lg:text-h5 lg:font-normal">
              {pkr(product.price)}
            </span>
            {onSale && (
              <span className="text-caption tabular-nums text-ash line-through">{pkr(product.compareAtPrice)}</span>
            )}
            {size && (
              <span className="ml-1 hidden text-caption uppercase tracking-widest text-ash lg:inline">
                <span className="sr-only">Selected size </span>· {size}
              </span>
            )}
            {color && (
              <span className="ml-1 hidden text-caption text-ash lg:inline">
                <span className="sr-only">Selected colour </span>· {color}
              </span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            disabled={actionDisabled || !ready}
            className="btn btn-outline min-h-[46px] min-w-[120px] inline-flex items-center justify-center gap-2 disabled:opacity-40 sm:min-w-[150px] lg:min-w-[170px]"
            aria-busy={adding}
          >
            {adding ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : added && pulse ? (
              <CheckCircle2 size={15} aria-hidden="true" />
            ) : null}
            {addLabel}
          </button>
          {onBuyNow && (
            <button
              type="button"
              onClick={onBuyNow}
              disabled={actionDisabled || !ready}
              className="btn btn-primary min-h-[46px] min-w-[110px] inline-flex items-center justify-center gap-2 disabled:opacity-40 sm:min-w-[140px]"
              aria-busy={adding}
            >
              {adding ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : 'Buy now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
