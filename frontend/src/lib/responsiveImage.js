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
  // Bypass responsive formats for Gemini PNGs to prevent 404 on missing AVIF/WEBP variants
  if (src.includes('gemini') || src.endsWith('.png')) return null;
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
  /* PHASE 3 re-measure. The flat 320px tail meant a card pulled the 400w
     variant at every desktop width. With the wider shell a card renders ~270px
     at 1440 and ~330px at 2560 (5 columns), which needs up to 660 device px at
     DPR 2 — so the browser must be allowed to reach for 800w. */
  /* FINAL. The tail was a fixed `320px`, but MEASURED at 1920 a card slot is
     404px — the browser was handed a 320w promise and resolved a file smaller
     than the box (0.79x). A fixed-px tail cannot track a fluid shell; the
     container keeps growing to 1840 while the promise stays flat.
     Stated in vw so the tail scales with the grid (404/1920 = 21vw). */
  card: '(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 21vw',

  /* FINAL. MEASURED at 1440: three homepage compositions render cards far
     WIDER than the 21vw SIZES.card promises, so the browser resolved the 400w
     variant into slots that needed much more:
       Edit / Best Sellers lead   624px slot from a 302px file — 0.48x
       New Arrivals plate         405px slot from a 302px file — 0.75x
     A 0.48x image is visibly soft, and it is the largest photograph in the
     section. These two keys state the real slot width so the srcset picks the
     800w file. Nothing else changes: same images, same crops, same layout. */
  /* The lead plate is col-span-2/3 (full grid width) until the 12-column
     layout starts at xl=1280 — NOT at 1024. Promising 46vw at tablet resolved
     a 353px file into a 704px slot (0.50x). The breakpoint must match the
     component's own, so the tail only kicks in from 1280. */
  cardLead: '(max-width: 1279px) 94vw, 44vw',
  cardWide: '(max-width: 640px) 45vw, (max-width: 1024px) 46vw, 29vw',
  hero: '100vw',
  tile: '(max-width: 640px) 90vw, 45vw',
  thumb: '96px',
  full: '(max-width: 1024px) 100vw, 800px',

  /* PRODUCT GALLERY — Phase 2C, and the reason this key exists.
   *
   * MEASURED on live before adding it: the PDP main frame was inheriting
   * SIZES.card. That string promises the browser a 45vw slot, so on a 390px
   * phone at DPR 2 it asked for ~176px and happily took the 400px AVIF for a
   * box that actually renders 358 CSS px = 716 device px. The hero shot of the
   * product — the single most important image on the site — was being upscaled
   * 1.79x. Desktop was worse: a 488px frame at DPR 2 needs 976px and got the
   * 800px file via the same 320px promise.
   *
   * The real widths, read off the rendered layout:
   *   <=640px   frame = viewport - 32px page padding  ~= 92vw
   *   <=1024px  same single-column grid               ~= 92vw
   *   >1024px   half of a max-w-7xl (1280px) grid minus the 64px gap and the
   *             76px thumbnail rail = 488px, so 560px covers 1440 and 1920.
   */
  /* RE-MEASURED in Phase 2F at every breakpoint, because the first version was
     right on phones and wrong everywhere else. Actual rendered frame width:
        390 -> 358 (91.8vw)      1024 -> 356 (34.8vw)
        640 -> 520 (81.3vw)      1280 -> 484 (37.8vw)
        768 -> 616 (80.2vw)      1440 -> 484 (33.6vw)
                                 1920 -> 484 (25.2vw)
     Three faults in '(max-width: 1024px) 92vw, 560px':
       1. 92vw only holds below 640; from 640 the container caps and the frame
          is ~80vw, so the browser was told 706px for a 616px box at 768.
       2. the breakpoint was ONE PIXEL out. The two-column grid starts AT
          1024px (Tailwind lg), so at exactly 1024 the frame is 356px while
          `max-width: 1024px` still promised 942px — a 2.6x over-request.
       3. 560px overstated the 484px frame from lg up.
     The frame never exceeds 616 CSS px = 1232 device px at DPR 2, which no
     variant can satisfy (largest is 800), but an honest `sizes` at least stops
     the browser over-fetching on desktop where the box is only 484px. */
  pdp: '(max-width: 639px) 92vw, (max-width: 1023px) 81vw, (max-width: 1439px) 620px, 780px',

  /* The vertical thumbnail rail renders at exactly 64 CSS px (h-20 w-16), so
     128 device px on a retina screen. It was inheriting SIZES.card too and
     pulling the 800px variant for every thumb — four full-size images to draw
     four postage stamps. */
  railThumb: '64px',
};

/* The blur placeholders live in public/imageLqip.json, deliberately OUT of the
   bundle: they are 69 KB of base64 and importing them cost 40 KB gzip on every
   page load. Nothing fetches that file yet. A CSS-only shimmer costs zero bytes
   and reserves the same box, which is what actually prevents the layout shift —
   the blur was only ever cosmetic. */
export const lqipFor = () => '';

/** Intrinsic width, so a caller can set width/height and reserve the box. */
export const naturalWidth = (src) => imageInfo(src)?.natural || 0;
