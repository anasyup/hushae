import { useEffect, useRef, useState } from 'react';
import { pkr } from '../../lib/format';
import Img from '../../components/Img';
import { CheckCircle2, Loader2 } from 'lucide-react';

/* Compact, calm sticky buy bar. Appears once the in-page CTA row scrolls out.
 * Mobile docks above MobileNav; desktop shows a thin hairline strip with
 * thumbnail + name/price/size + Add + Buy Now. Publishes its height to
 * --buy-bar-h so other docked elements (compare, toasts, WA) can sit above. */
export default function StickyBuyBar({
  product, watchRef, size, color, needsSize,
  onAdd, onBuyNow, disabled, adding = false, added = false, thumb,
}) {
  const [show, setShow] = useState(false);
  const [pulse, setPulse] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    const el = watchRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        const past = entry.boundingClientRect.bottom < (entry.rootBounds?.top ?? 0) + 72;
        setShow(!entry.isIntersecting && past);
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [watchRef]);

  useEffect(() => {
    if (added) { setPulse(true); const t = setTimeout(() => setPulse(false), 1600); return () => clearTimeout(t); }
    return undefined;
  }, [added]);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return undefined;
    const root = document.documentElement;
    const publish = () => { const h = Math.round(el.getBoundingClientRect().height); if (h > 0) root.style.setProperty('--buy-bar-h', `${h}px`); };
    publish();
    let ro;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(publish); ro.observe(el); }
    window.addEventListener('resize', publish);
    return () => {
      ro?.disconnect(); window.removeEventListener('resize', publish); root.style.removeProperty('--buy-bar-h');
    };
  }, []);

  const onSale = product.compareAtPrice > product.price;
  const ready = needsSize ? !!size : true;
  const actionDisabled = disabled || adding;
  const addLabel = disabled ? 'Sold out' : adding ? 'Adding…' : added && pulse ? 'Added' : needsSize && !size ? 'Select size' : 'Add to bag';

  return (
    <div
      ref={barRef}
      aria-hidden={!show}
      inert={!show ? '' : undefined}
      className={`fixed inset-x-0 border-t border-line bg-alabaster/95 backdrop-blur-xl transition-transform duration-base ease-standard motion-reduce:transition-none
                  bottom-[calc(53px+env(safe-area-inset-bottom))] md:bottom-0 lg:border-t lg:bg-alabaster/95 ${
        show ? 'translate-y-0' : 'pointer-events-none translate-y-[150%]'
      } pb-[max(0.6rem,env(safe-area-inset-bottom))]`}
      style={{ zIndex: 'var(--z-stickybar)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-3 pt-2.5 md:px-6 lg:gap-4 xl:max-w-[1360px] xl:px-10 2xl:max-w-[1560px] 2xl:px-14 3xl:max-w-shell 3xl:px-16">
        {thumb && (
          <span aria-hidden="true" className="hidden shrink-0 lg:block">
            <Img src={thumb} alt="" sizes="36px" width="36" height="45" className="h-11 w-9 rounded-control object-cover" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] uppercase tracking-wide text-ash lg:text-[12px]">
            {product.name}
            {size && <span className="ml-1.5 text-obsidian">· {size}</span>}
            {color && <span className="ml-1 text-obsidian/70">· {color}</span>}
          </p>
          <p className="flex items-baseline gap-1.5">
            <span className="font-display text-[17px] leading-none tabular-nums lg:text-[19px]">{pkr(product.price)}</span>
            {onSale && <span className="hidden text-[11px] tabular-nums text-ash line-through sm:inline">{pkr(product.compareAtPrice)}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button type="button" onClick={onAdd} disabled={actionDisabled || !ready}
            className="btn btn-outline inline-flex h-11 min-w-[110px] items-center justify-center gap-1.5 px-4 text-[11px] disabled:opacity-40 sm:min-w-[132px] lg:min-w-[160px]"
            aria-busy={adding}>
            {adding ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : added && pulse ? <CheckCircle2 size={13} aria-hidden="true" /> : null}
            {addLabel}
          </button>
          {onBuyNow && (
            <button type="button" onClick={onBuyNow} disabled={actionDisabled || !ready}
              className="btn btn-primary inline-flex h-11 min-w-[96px] items-center justify-center px-4 text-[11px] disabled:opacity-40 sm:min-w-[112px]">
              {adding ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : 'Buy now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
