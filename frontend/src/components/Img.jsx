import { useState } from 'react';
import { isVideoFile } from '../lib/media';
import { SIZES, lqipFor, pictureSources } from '../lib/responsiveImage';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1125"><rect width="100%" height="100%" fill="#E6DCD2"/><text x="50%" y="50%" fill="#69625F" font-family="Jost,Helvetica,Arial,sans-serif" font-size="34" letter-spacing="12" text-anchor="middle">HUSHAE</text></svg>`
  );

/* ============================================================================
 * Img — the one image component. Upgraded in place rather than replaced, so
 * all ~20 existing callers get AVIF/WebP, srcset and a blur placeholder with
 * no edit at their call site and no second component to keep in sync.
 *
 * MEASURED, and why each piece is here
 *
 *   AVIF/WEBP + srcset  The live mobile homepage downloaded 17.6 MB of PNG.
 *                       The same 19 images as 400px AVIF are 0.36 MB.
 *                       <picture> falls back to the original <img src> for any
 *                       browser that wants it, so nothing can break.
 *
 *   BLUR PLACEHOLDER    The old version faded in from `opacity-0`. An image
 *                       that is invisible until decoded cannot be the LCP
 *                       element — the browser paints nothing, then paints
 *                       everything. The LQIP is a ~350 byte inline data URI
 *                       painted as a background, so there is real content in
 *                       the box from the first frame and the fade happens on
 *                       top of it rather than out of nothing.
 *
 *   NO opacity ON THE   Keeping the fade meant keeping the blank first paint.
 *   PRIORITY PATH       `priority` images skip the transition entirely and are
 *                       eager + high fetchpriority, because the hero is the LCP
 *                       element and every millisecond of it is measured.
 * ========================================================================== */

export default function Img({
  src,
  alt = '',
  className = '',
  sizes = SIZES.card,
  priority = false,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);

  // Video sources render as a silent auto-playing preview (cards, tiles, thumbs)
  if (!err && isVideoFile(src)) {
    return (
      <video src={src} muted loop autoPlay playsInline preload="metadata"
        onError={() => setErr(true)} className={className} />
    );
  }

  const finalSrc = err ? FALLBACK : src;
  const sources = err ? [] : pictureSources(src);
  const blur = err ? '' : lqipFor(src);

  /* The fade is a nicety, not a requirement. It is skipped for priority images
     and skipped again once loaded, so it never delays or hides the LCP. */
  const fade = priority
    ? ''
    : `transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`;

  const img = (
    <img
      src={finalSrc}
      alt={alt}
      sizes={sources.length ? sizes : undefined}
      loading={priority ? 'eager' : 'lazy'}
      // fetchPriority is React 19 / DOM-cased; lowercase is the HTML attribute.
      fetchpriority={priority ? 'high' : undefined}
      decoding={priority ? 'sync' : 'async'}
      onLoad={() => setLoaded(true)}
      onError={() => setErr(true)}
      className={`${className} ${fade}`}
      {...rest}
    />
  );

  if (!sources.length && !blur) return img;

  return (
    <picture
      /* The placeholder lives on the <picture>, not the <img>, so it is not
         covered by the image's own transparent pixels while it fades in. */
      style={blur ? {
        backgroundImage: `url("${blur}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
      className={blur ? 'block overflow-hidden' : undefined}
    >
      {sources.map((s) => <source key={s.type} type={s.type} srcSet={s.srcSet} sizes={sizes} />)}
      {img}
    </picture>
  );
}
