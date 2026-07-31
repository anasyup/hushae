import manifest from './imageManifest.json';

/* ============================================================================
 * RESPONSIVE IMAGE RESOLVER
 *
 * MEASURED BEFORE WRITING THIS
 *   public/images        341 sources, 72.4 MB, zero webp, zero avif
 *   live mobile homepage 19 images, 17.6 MB downloaded
 *   hero-women-bra.png   2,316 KB  ->  13 KB as 400px AVIF  (-99%)
 *
 * scripts/optimize-images.mjs emits `<name>-<width>.webp` and `.avif` beside
 * every source and records what exists in imageManifest.json. This turns a
 * plain `/images/foo.png` into the srcset the browser needs — and returns
 * nothing at all when the file is not in the manifest, so an uploaded product
 * photo or a remote URL falls straight through to a normal <img>.
 *
 * WHY A BUILD-TIME MANIFEST AND NOT A GUESS
 *   Guessing that `foo-400.avif` exists produces a 404 for every image the
 *   optimiser skipped — a 558px-wide source has no 800px variant, by design.
 *   The manifest is 102 KB raw, but it is JSON of mostly base64 LQIP strings
 *   and gzips hard; measured in the bundle report after this shipped.
 * ========================================================================== */

/** Everything known about one source path, or null. */
export function imageInfo(src) {
  if (!src || typeof src !== 'string') return null;
  // Only local, optimiser-managed paths. A Cloudinary or data: URL is not ours.
  if (!src.startsWith('/images/')) return null;
  const clean = src.split('?')[0].split('#')[0];
  const e = manifest[clean];
  // Compact keys: w = widths, n = natural width. See optimize-images.mjs for
  // why the blur strings are NOT in this file.
  return e ? { widths: e.w, natural: e.n } : null;
}

const stem = (src) => src.split('?')[0].replace(/\.(png|jpe?g)$/i, '');

/**
 * Build `<source>` descriptors for a <picture>.
 * AVIF first because it is the smallest — the browser takes the first type it
 * understands, so order is the whole mechanism.
 */
export function pictureSources(src) {
  const info = imageInfo(src);
  if (!info || !info.widths?.length) return [];
  const base = stem(src);
  return ['avif', 'webp'].map((type) => ({
    type: `image/${type}`,
    srcSet: info.widths.map((w) => `${base}-${w}.${type} ${w}w`).join(', '),
  }));
}

/**
 * `sizes` tells the browser how wide the image will RENDER before layout, which
 * is the only way it can pick sensibly from srcset. Getting this wrong is worse
 * than omitting srcset: the browser defaults to 100vw and downloads the largest
 * variant on a phone.
 *
 * These strings come from the real rendered widths in this theme.
 */
export const SIZES = {
  card: '(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 320px',
  hero: '100vw',
  tile: '(max-width: 640px) 90vw, 45vw',
  thumb: '96px',
  full: '(max-width: 1024px) 100vw, 800px',
};

/* The blur placeholders live in public/imageLqip.json, deliberately OUT of the
   bundle: they are 69 KB of base64 and importing them cost 40 KB gzip on every
   page load. Nothing fetches that file yet. A CSS-only shimmer costs zero bytes
   and reserves the same box, which is what actually prevents the layout shift —
   the blur was only ever cosmetic. */
export const lqipFor = () => '';

/** Intrinsic width, so a caller can set width/height and reserve the box. */
export const naturalWidth = (src) => imageInfo(src)?.natural || 0;
