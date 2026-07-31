import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import Img from './Img';
import { SIZES } from '../lib/responsiveImage';

/**
 * ProductImageZoom
 * Desktop: cursor-follow magnifier (2.5× zoom into the region under the mouse).
 * Mobile / touch: tap the image to open a full-screen lightbox with pinch/native zoom.
 * `src` and `alt` are the same as an <Img>.
 */
export default function ProductImageZoom({ src, alt = '', eager = false }) {
  const wrapRef = useRef(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [zooming, setZooming] = useState(false);
  const [full, setFull] = useState(false);
  /* Latched: the magnifier layer downloads the full-resolution original, so it
     is not mounted until the shopper first hovers. Latched rather than tied to
     `zooming` so the second hover does not re-fetch or flicker. */
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!full) return;
    const onEsc = (e) => { if (e.key === 'Escape') setFull(false); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; };
  }, [full]);

  const handleMove = (e) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  return (
    <>
      <div
        ref={wrapRef}
        className="group relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-satin/40 select-none"
        onMouseEnter={() => { setArmed(true); setZooming(true); }}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={handleMove}
        onClick={() => setFull(true)}
        role="button"
        /* The visible hint reads "Tap to zoom" / "Hover to zoom", so the
           accessible name has to contain that text or axe reports
           label-content-name-mismatch. Leading with the verb satisfies both
           the shopper and WCAG 2.5.3. */
        aria-label={`Zoom — tap to zoom ${alt || 'product image'}`}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFull(true); } }}
      >
        {/* base image */}
        {/* The first gallery frame is the LCP candidate on a PDP; Img defaults
            to loading="lazy", which delayed it. `eager` opts that one out. */}
        {/* sizes: this frame is NOT a product card. Inheriting SIZES.card told
            the browser to expect a 45vw slot and it fetched the 400px variant
            for a 716 device-px box — a measured 1.79x upscale on the single
            most important photograph on the site. SIZES.pdp states the real
            geometry. */}
        <Img
          src={src}
          alt={alt}
          sizes={SIZES.pdp}
          loading={eager ? 'eager' : 'lazy'}
          fetchpriority={eager ? 'high' : undefined}
          className={`h-full w-full object-cover transition-opacity duration-fast ${zooming ? 'opacity-0 md:opacity-0' : 'opacity-100'}`}
        />

        {/* zoomed image — desktop only (>=768px)
            MEASURED: this layer named the ORIGINAL, unoptimised source. A
            background-image is fetched as soon as the element is painted, so
            every desktop PDP downloaded the full JPG — 224.7 KB on
            cat-panties-hero.jpg — on top of the 61.7 KB AVIF already showing.
            39% of the page's image bytes went to a layer at opacity 0 that
            most shoppers never trigger.

            `armed` flips on the first hover, so the file is fetched when the
            shopper actually reaches for the magnifier and never before. It
            stays armed afterwards, so moving the cursor back is instant. */}
        {armed && (
          <div
            className="pointer-events-none absolute inset-0 hidden bg-no-repeat md:block"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: '250%',
              backgroundPosition: `${pos.x}% ${pos.y}%`,
              opacity: zooming ? 1 : 0,
              transition: 'opacity 150ms ease',
            }}
            aria-hidden="true"
          />
        )}

        {/* Hint chip (bottom-right) */}
        {/* Decorative hints. They are inside a role="button", so leaving them
            in the accessibility tree made the visible text disagree with the
            aria-label — WCAG 2.5.3, flagged as label-content-name-mismatch. */}
        <div aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-full bg-obsidian/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-alabaster opacity-0 backdrop-blur transition-opacity duration-fast group-hover:opacity-100 md:inline-flex">
          <ZoomIn size={12} /> Hover to zoom
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-obsidian/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-alabaster backdrop-blur md:hidden">
          <ZoomIn size={12} /> Tap to zoom
        </div>
      </div>

      {/* Full-screen lightbox — mobile pinch-zoom friendly */}
      {full && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-obsidian/95 p-3 backdrop-blur-sm"
          onClick={() => setFull(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Product image"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setFull(false); }}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-alabaster transition hover:bg-white/20"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full touch-manipulation object-contain"
            style={{ touchAction: 'pinch-zoom' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
