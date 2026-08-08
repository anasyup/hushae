import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

/* ============================================================================
 * Banner — renders a slot's active banner and tracks analytics.
 *
 *  · Fetches GET /api/banners?slot=<key>&device=<all|desktop|mobile> once.
 *  · IntersectionObserver fires the impression counter when the banner is
 *    ≥50% visible for ~1s (once per mount).
 *  · CTA click posts the click counter, then navigates to ctaLink.
 *
 * Props:
 *   slot    — slot key (homepage-hero, homepage-below, …)
 *   fallback— React node rendered when no banner is live (or while loading)
 *   className— wrapper classes (width/height by slot handled by call site)
 * ========================================================================== */

function deviceType() {
  if (typeof window === 'undefined') return 'all';
  return window.matchMedia('(min-width: 768px)').matches ? 'desktop' : 'mobile';
}

export default function Banner({ slot, fallback = null, className = '' }) {
  const [banner, setBanner] = useState(undefined); // undefined = loading
  const ref = useRef(null);
  const tracked = useRef(false);

  useEffect(() => {
    let alive = true;
    setBanner(undefined);
    api(`/banners?slot=${encodeURIComponent(slot)}&device=${deviceType()}`)
      .then((d) => { if (alive) setBanner(d.banner); })
      .catch(() => { if (alive) setBanner(null); });
    return () => { alive = false; };
  }, [slot]);

  /* Impression — 50% visible for 1s, once. */
  useEffect(() => {
    const el = ref.current;
    if (!el || !banner || tracked.current) return undefined;
    let timer = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio >= 0.5 && !tracked.current) {
        timer = setTimeout(() => {
          if (tracked.current) return;
          tracked.current = true;
          api(`/banners/${banner._id}/impression`, { method: 'POST' }).catch(() => {});
        }, 1000);
      } else if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }, { threshold: [0.5] });
    io.observe(el);
    return () => { if (timer) clearTimeout(timer); io.disconnect(); };
  }, [banner]);

  const click = (e) => {
    if (!banner) return;
    api(`/banners/${banner._id}/click`, { method: 'POST' }).catch(() => {});
    if (banner.ctaLink && banner.ctaLink.startsWith('http')) {
      e.preventDefault();
      window.open(banner.ctaLink, '_blank', 'noopener');
    }
  };

  if (banner === undefined || banner === null) return fallback;

  const overlay = Math.min(90, Math.max(0, Number(banner.overlayOpacity) || 40)) / 100;
  const posCls = banner.textPosition === 'center' ? 'items-center text-center'
    : banner.textPosition === 'right' ? 'items-end text-right' : 'items-start text-left';
  const inner = (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {/* Media */}
      {banner.type === 'video' && banner.mediaUrl ? (
        <video src={banner.mediaUrl} poster={undefined} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
      ) : banner.type === 'html' && banner.html ? (
        <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: banner.html }} />
      ) : (
        banner.mediaUrl && <img src={banner.mediaUrl} alt={banner.heading || banner.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlay})` }} />

      {/* Text */}
      {(banner.heading || banner.subtitle || banner.ctaText) && (
        <div className={`relative flex h-full flex-col justify-center px-6 md:px-12 ${posCls}`}>
          {banner.heading && (
            <h3 className="font-sans text-3xl font-light uppercase tracking-[0.12em] md:text-5xl"
              style={{ color: banner.textColor }}>
              {banner.heading}
            </h3>
          )}
          {banner.subtitle && (
            <p className="mt-3 max-w-md text-[13px] uppercase tracking-[0.18em] opacity-90 md:text-sm"
              style={{ color: banner.textColor }}>
              {banner.subtitle}
            </p>
          )}
          {banner.ctaText && (
            <span
              onClick={click}
              className="mt-6 inline-flex min-h-[44px] w-fit cursor-pointer items-center justify-center bg-white px-8 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-colors duration-300 hover:bg-[#C9A96E] hover:text-white"
            >
              {banner.ctaText}
            </span>
          )}
        </div>
      )}
    </div>
  );

  /* CTA link — anchor wraps the whole banner when a link exists. */
  if (banner.ctaLink && !banner.ctaLink.startsWith('http')) {
    return (
      <Link to={banner.ctaLink} onClick={click} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
