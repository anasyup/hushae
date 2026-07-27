import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import Img from './Img';

/**
 * ProductImageZoom
 * Desktop: cursor-follow magnifier (2.5× zoom into the region under the mouse).
 * Mobile / touch: tap the image to open a full-screen lightbox with pinch/native zoom.
 * `src` and `alt` are the same as an <Img>.
 */
export default function ProductImageZoom({ src, alt = '' }) {
  const wrapRef = useRef(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [zooming, setZooming] = useState(false);
  const [full, setFull] = useState(false);

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
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={handleMove}
        onClick={() => setFull(true)}
        role="button"
        aria-label="Zoom product image"
        tabIndex={0}
      >
        {/* base image */}
        <Img
          src={src}
          alt={alt}
          className={`h-full w-full object-cover transition-opacity duration-200 ${zooming ? 'opacity-0 md:opacity-0' : 'opacity-100'}`}
        />

        {/* zoomed image — desktop only (>=768px) */}
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

        {/* Hint chip (bottom-right) */}
        <div className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-obsidian/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-alabaster opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100 md:group-hover:opacity-100">
          <ZoomIn size={12} /> Hover to zoom
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-obsidian/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-alabaster backdrop-blur md:hidden">
          <ZoomIn size={12} /> Tap to zoom
        </div>
      </div>

      {/* Full-screen lightbox — mobile pinch-zoom friendly */}
      {full && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-obsidian/95 p-3 backdrop-blur-sm"
          onClick={() => setFull(false)}
          role="dialog"
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
