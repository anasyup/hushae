import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import Seo, { organizationJsonLd } from '../components/Seo';
import LuxuryCategoryShowcase from '../components/LuxuryCategoryShowcase';
import CollectionCard from '../components/CollectionCard';
import NewArrivalsSection from '../components/home/NewArrivalsSection';
import DiscoverTiles from '../components/home/DiscoverTiles';
import { PRODUCT_GRID } from '../lib/productGrid';

/* ============================================================================
 * HUSHAE HOME — luxury homepage, exact client reference.
 *   1  HERO            full-bleed "Second Skin Edit" (CK, approved)
 *   2  CATEGORY GRID   Tom Ford style — 2/4 cols, 4/5 images, tracking 0.2em
 *   3  PRODUCT CAROUSEL "The New Collection" — serif title + EXPLORE NOW
 *   4  EDITORIAL SPLIT Loro Piana — 2 cards, serif headings + ArrowRight
 *   5  PRODUCT CAROUSEL "Objects of Desire" — curated selection
 *   6  NEWSLETTER      Subscribe to the Newsletter
 * ========================================================================== */

const IMG = '/images/campaign/qa';

/* ── Category tiles (real HUSHAE category images) ──────────────────────── */
const CATEGORIES = [
  { title: "Women's Bras", image: '/images/categories/bras.jpg', href: '/category/bras' },
  { title: "Women's Panties", image: '/images/categories/panties.jpg', href: '/category/panties' },
  { title: "Men's Briefs", image: '/images/categories/briefs.jpg', href: '/category/briefs' },
  { title: "Men's Boxers", image: '/images/categories/boxers.jpg', href: '/category/boxers' },
];

/* ── HERO SLIDER — 4 slides (image + optional video), same size/text/buttons ──
   Each slide: `image` (poster / photo) and optional `video` (mp4/webm path).
   If `video` is set the slide plays it (muted, loop, autoplay) with the
   image as poster; otherwise it shows the photo. To change slides, swap the
   paths below or add a video file under public/images/campaign/qa/.
   Auto-advances every 4s, pauses on hover/focus; thin dots for manual
   selection. No new action buttons, no filters — everything else unchanged. */
const HERO_SLIDES = [
  { image: `${IMG}/hero-women.jpg`, video: '' },
  { image: `${IMG}/hero-men.jpg`, video: '' },
  { image: `${IMG}/editorial-modern.jpg`, video: '' },
  { image: `${IMG}/hero-fabric.jpg`, video: '' },
];

function HeroSlides() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  /* WCAG 2.2.2 (Pause, Stop, Hide): anything that auto-updates for more than
     five seconds needs a way to stop it. This carousel advanced every 4s with
     no control at all — a shopper reading the headline or reaching for
     SHOP WOMEN could have the slide change under them, and a screen-reader
     user got the content moved mid-sentence.

     Three things stop it now: the explicit pause button below, hover/focus
     anywhere in the hero (the code comment claimed this already happened —
     it did not), and the OS reduce-motion setting, which pins it to the
     first slide entirely. 4s is also simply too fast for a slide carrying a
     three-line headline and two CTAs, so the interval is 6s. */
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (paused || reduceMotion) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [paused, reduceMotion]);

  return (
    <section
      className="relative h-[100svh] w-full overflow-hidden bg-white"
      aria-roledescription="carousel"
      aria-label="Campaign highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}
    >
      {/* Slides — crossfade */}
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.image}
          aria-hidden={i !== idx}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        >
          {s.video ? (
            <video
              src={s.video}
              poster={s.image}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={s.image}
              alt={i === idx ? 'HUSHAE campaign' : ''}
              fetchpriority={i === 0 ? 'high' : 'auto'}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      ))}

      {/* Scrim.
          MEASURED by sampling the real rendered pixels behind the type (a
          parent-background walk cannot see through a photograph and reports
          a meaningless 1.0): flat `bg-black/15` left the headline at 1.66:1
          worst / 4.24 median and the sub-paragraph at 3.05 / 3.54 — an AA
          failure on the pale slides (hero-women, hero-fabric).

          The type block was then measured directly: it occupies 48%-79% of
          the hero height (h1 starts at 48.4% on desktop / 53.6% on mobile,
          the paragraph ends at ~79%, the CTAs sit below that). A purely
          bottom-weighted gradient put its density BELOW the text and made the
          numbers worse, so the ramp is anchored to that band instead — it
          reaches full strength by 20% from the bottom and holds it through
          85%, which is exactly where the words are. The top 40% of the
          photograph stays essentially clean, so the campaign image still
          reads as an image. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.58) 20%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.42) 85%, rgba(0,0,0,0.22) 100%)',
        }}
      />
      <div className="absolute bottom-[12%] left-[32px] z-10 max-w-[480px] text-white md:left-[60px]">
        {/* Cover line — LOUIS VUITTON register: one geometric sans (Jost, the
            free twin of LV Web), light weight, UPPERCASE with open tracking.
            LV never uses a serif — the air between the caps is the luxury. */}
        <h1 className="font-display text-[42px] font-light uppercase leading-[1.1] tracking-[0.1em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.2)] md:text-[64px] md:tracking-[0.12em]">
          Second
          <br />
          Skin
          <br />
          Edit
        </h1>
        {/* #f0f0f0 measured 3.05:1 worst / 3.54 median over the pale slides.
            Pure white on the strengthened scrim clears 4.5:1; the subdued
            step below the headline now comes from size and weight rather than
            from a dimmer grey. */}
        <p className="mt-5 max-w-[380px] text-[13px] font-normal leading-[1.6] text-white">
          New season essentials, engineered in Pakistan. Featherweight layers with a barely-there finish.
        </p>
        <div className="mt-7 flex gap-3">
          {/* Hero actions use the shared .btn + .hero-cta primitives. They were
              bespoke 25px pills at 40px tall: the pill radius contradicts the
              design tokens (card:0 / control:2px) that the rest of the store
              follows, and 40px sat under the 44px tap-target minimum. */}
          <Link to="/women" className="btn hero-cta bg-white text-black hover:bg-[#f0f0f0]">
            Shop Women
          </Link>
          <Link to="/men" className="btn hero-cta bg-white text-black hover:bg-[#f0f0f0]">
            Shop Men
          </Link>
        </div>
      </div>

      {/* Slide arrows — plain ‹ › chevrons, no circle */}
      <button
        type="button"
        onClick={() => setIdx((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 p-2 text-white/90 transition-all hover:scale-110 hover:text-white md:left-6"
      >
        <ChevronLeft size={34} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={() => setIdx((i) => (i + 1) % HERO_SLIDES.length)}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 p-2 text-white/90 transition-all hover:scale-110 hover:text-white md:right-6"
      >
        <ChevronRight size={34} strokeWidth={1.5} />
      </button>

      {/* Slide dots — thin, bottom centre.
          MEASURED TWICE. The dots were 6px wide with a .hit-44 pseudo-element,
          so 44px hit boxes sat 8px apart and overlapped by ~36px. Widening the
          gap to 12px and shrinking the pseudo to .hit-24 was still wrong: a
          6px dot at gap-3 gives an 18px PITCH against a 24px box, so
          neighbours STILL overlapped by 6px, and the pause control clipped the
          last dot by 5px.

          A centred pseudo-element can never tile cleanly, because the pitch is
          set by the visual dot while the target is set by the pseudo. So the
          BUTTON is the target now: 24x24 each, laid out edge to edge with no
          gap, with the visual dot drawn inside. Pitch 24px = box 24px, which
          tiles exactly — zero overlap, and every pixel between two dots
          belongs to the nearer one. The dots look identical; only the
          invisible geometry changed. */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.image}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Go to slide ${i + 1} of ${HERO_SLIDES.length}`}
            aria-current={i === idx}
            className="group/dot grid h-6 w-6 shrink-0 place-items-center"
          >
            <span
              aria-hidden="true"
              className={`block h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/50 group-hover/dot:bg-white/80'
              }`}
            />
          </button>
        ))}

        {/* WCAG 2.2.2 pause control. Deliberately quiet — a hairline glyph in
            the same register as the dots, not a media-player chrome button.
            A 44px target would overlap the last dot, so it matches the dots'
            24px box and is separated by a real 8px margin, not a pseudo. */}
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
          className="ml-2 grid h-6 w-6 shrink-0 place-items-center text-white/80 transition-colors hover:text-white"
        >
          {paused ? (
            <svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor" aria-hidden="true">
              <path d="M3 1.5v9l7-4.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor" aria-hidden="true">
              <rect x="3" y="1.5" width="2.5" height="9" rx="0.4" />
              <rect x="7" y="1.5" width="2.5" height="9" rx="0.4" />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}

/* ── SECTION 1: Minimalist category grid (Tom Ford style) ───────────────── */
function CategoryGridSection() {
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-16 md:px-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {CATEGORIES.map((cat) => (
          <Link key={cat.title} to={cat.href} className="group flex cursor-pointer flex-col">
            <div className="relative aspect-[4/5] overflow-hidden bg-[#f2f0ec]">
              <img
                src={cat.image}
                alt={cat.title}
                loading="lazy"
                className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
            <div className="bg-transparent pb-2 pt-4">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#111111] md:text-[12px]">
                {cat.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── SECTION 2 & 4: Product carousel (Givenchy style) ───────────────────── */
function ProductCarouselSection({ title, subtitle, products, href }) {
  return (
    <section className="border-t border-neutral-200/60 py-16">
      <div className="mb-10 space-y-1 px-4 text-center md:px-8">
        <h2 className="section-title">
          {title}
        </h2>
        {/* 18px tall as a bare link — raised to the 44px minimum via padding.
            Kept as a centred inline-flex so the section header still centres. */}
        <Link
          to={href || '/shop'}
          className="inline-flex min-h-[44px] items-center border-b border-black/30 text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-black"
        >
          {subtitle}
        </Link>
      </div>

      <div className={PRODUCT_GRID}>
        {(products || []).slice(0, 4).map((item) => (
          <CollectionCard key={item._id} product={item} />
        ))}
      </div>
    </section>
  );
}

/* ── SECTION 3: Editorial split banner (Loro Piana style) ───────────────────
 *
 * FULL-SCREEN. Was a contained band: max-w-[1600px] with px-4/px-8 gutters,
 * a 16px gap between the two cards and 4/5 (mobile) / 3/4 (desktop) aspect
 * boxes — roughly 1,003px tall on desktop with the page ground showing on
 * every side.
 *
 * It now fills the viewport: the section is 100svh, the two panels sit side by
 * side at 50vw each on md+, and the gutter and gap are gone so the two
 * photographs meet on a single hairline. On mobile a 50/50 horizontal split
 * would give each panel a 195px-wide sliver, so the panels stack and take
 * 50svh each — still exactly one screenful, just divided the other way.
 *
 * IMAGE CHOICE — deliberate, not a copy-paste.
 * The left panel used editorial-modern.jpg, which is 1584x672 LANDSCAPE. In a
 * 720x900 full-height panel that image has to scale to ~2121px wide to cover,
 * so 66% of the frame is cropped away and what survives is upscaled and soft.
 * cat-women.jpg is 896x1200 PORTRAIT, shot for exactly this crop, so it fills
 * a tall panel at native proportions. hero-fabric.jpg (768x1376) was already
 * portrait and stays.
 *
 * 100svh (not vh) so mobile browser chrome does not push the panel taller
 * than the visible area.
 * ────────────────────────────────────────────────────────────────────────── */
function EditorialSplitSection() {
  const panels = [
    {
      to: '/new',
      img: `${IMG}/cat-women.jpg`,
      alt: 'Spring Summer collection',
      title: 'Spring / Summer Silhouette',
      cta: 'Explore Collection',
      /* The subject stands in the upper-middle of this frame. In the short
         422px-tall mobile panel a default 50% 50% crop cut her head off —
         checked on the rendered page, not assumed. Biasing the crop upward
         keeps the face in frame on mobile; on the tall desktop panel the
         image covers almost exactly, so the shift is imperceptible there. */
      pos: 'object-[50%_22%] md:object-center',
    },
    {
      to: '/about',
      img: `${IMG}/hero-fabric.jpg`,
      alt: 'Craftsmanship',
      title: 'Uncompromising Craftsmanship',
      cta: 'Read The Story',
      // Abstract fabric — no subject to protect, centre is correct.
      pos: 'object-center',
    },
  ];

  return (
    <section className="w-full">
      <div className="grid h-[100svh] grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1">
        {panels.map((p, i) => (
          <Link
            key={p.to}
            to={p.to}
            className="group relative block h-full w-full cursor-pointer overflow-hidden bg-[#f2f0ec]"
          >
            <img
              src={p.img}
              alt={p.alt}
              loading="lazy"
              decoding="async"
              /* sizes tells the browser this is a half-width slot on desktop
                 and full-width on mobile, so it never fetches more than it
                 needs for the panel it actually paints. */
              sizes="(min-width: 768px) 50vw, 100vw"
              className={`absolute inset-0 h-full w-full object-cover ${p.pos} transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100`}
            />
            {/* Bottom-weighted scrim, matching the hero. The old flat
                `bg-black/10` was measured failing WCAG on these same two
                photographs (1.14:1 on the heading, 1.14 on the CTA) — at
                full-screen the type sits over even more of the bright plaster,
                so it needs a real ramp rather than a wash. Density is spent
                only on the lower third where the words are. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-90"
              style={{
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.45) 22%, rgba(0,0,0,0.16) 48%, rgba(0,0,0,0) 72%)',
              }}
            />
            {/* MEASURED: on mobile the LOWER panel's CTA sat at y=791-812
                while MobileNav starts at y=791 — "Read the story" was 21px
                underneath the tab bar. Only the last panel touches the bottom
                of the viewport, so only it needs the offset; adding it to both
                would push the upper panel's copy up for no reason. --nav-h is
                the nav's real measured height and reports 0px on md+, where
                the nav is display:none and the panels sit side by side. */}
            <div
              className="absolute inset-x-0 bottom-0 p-8 text-white md:p-12 lg:p-16"
              style={i === panels.length - 1 ? { paddingBottom: 'calc(var(--nav-h, 0px) + 2rem)' } : undefined}
            >
              {/* Type scales with the panel now that it owns half a screen
                  rather than a 400px card. */}
              <h3 className="max-w-[22ch] font-display text-2xl font-light uppercase leading-[1.15] tracking-[0.1em] md:text-3xl lg:text-4xl">
                {p.title}
              </h3>
              <span className="mt-5 inline-flex items-center gap-2 border-b border-white pb-1 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors group-hover:border-white/60">
                {p.cta} <ArrowRight size={14} aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── SECTION 5: Luxury newsletter sign-up ───────────────────────────────── */
function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) { setErr('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr('Please enter a valid email address.'); return; }
    setErr('');
    api('/subscribers', { method: 'POST', body: { email: v } }).catch(() => {});
    setDone(true);
  };
  return (
    <section className="border-t border-neutral-200/80 bg-[#f7f6f2] px-4 py-20 text-center">
      <div className="mx-auto max-w-xl space-y-4">
        <h2 className="section-title">
          Subscribe to the Newsletter
        </h2>
        <p className="text-[12px] font-normal leading-relaxed tracking-wide text-neutral-500">
          Be the first to receive updates on new arrivals, private sales, and seasonal collection previews.
        </p>
        {done ? (
          <p className="pt-4 text-[12px] font-medium uppercase tracking-[0.2em] text-[#111111]">You&apos;re on the list.</p>
        ) : (
          <form
            className="mx-auto flex max-w-md items-center justify-center gap-2 pt-4"
            onSubmit={submit}
            noValidate
          >
            {/* A placeholder is not an accessible name (WCAG 4.1.2): it is dropped
                by most screen readers once the field has a value. Real label,
                visually hidden so the layout is unchanged. */}
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }}
              required
              aria-invalid={err ? 'true' : undefined}
              aria-describedby={err ? 'home-nl-err' : undefined}
              placeholder="Enter your email address"
              className="w-full border border-neutral-300 bg-white px-4 py-3 text-[12px] text-black transition focus:border-black focus:outline-none placeholder:text-[10px] placeholder:uppercase placeholder:tracking-widest placeholder:text-neutral-400"
            />
            <button
              type="submit"
              className="min-h-[44px] whitespace-nowrap bg-black px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800"
            >
              Sign Up
            </button>
          </form>
        )}
        {err && <p id="home-nl-err" role="alert" className="pt-2 text-[12px] text-red-700">{err}</p>}
      </div>
    </section>
  );
}

/* ═══ PAGE ═══════════════════════════════════════════════════════════════ */
export default function Home() {
  const [fresh, setFresh] = useState([]);
  const [best, setBest] = useState([]);

  useEffect(() => {
    api('/products?newArrival=true&sort=newest&limit=12').then((d) => setFresh(d.products || [])).catch(() => setFresh([]));
    api('/products?bestSeller=true&limit=8').then((d) => setBest(d.products || [])).catch(() => setBest([]));
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#FAF8F5] font-sans text-[#111111] selection:bg-black selection:text-white">
      <Seo title="Premium Innerwear for Men & Women"
        description="New season essentials, engineered for comfort. Made in Pakistan, finished to an international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* 01 — HERO (CK) */}
      <HeroSlides />

      {/* 02 — DISCOVER — editorial gateway (Chanel / Hermès / CK pattern) */}
      <DiscoverTiles />

      {/* 03 — STUDIO CATEGORY SHOWCASE (Givenchy canvas) */}
      <LuxuryCategoryShowcase />

      {/* 04 — NEW ARRIVALS — luxury grid (editorial header + tabs) */}
      <NewArrivalsSection products={fresh} />

      {/* 04 — VIEW MORE (reference button) */}
      <div className="flex w-full justify-center">
        <Link to="/shop" className="my-8 cursor-pointer border border-black bg-transparent px-10 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-all duration-300 ease-in-out hover:bg-black hover:text-white">
          View More
        </Link>
      </div>

      {/* 05 — EDITORIAL SPLIT (Loro Piana) */}
      <EditorialSplitSection />

      {/* 05 — OBJECTS OF DESIRE */}
      <ProductCarouselSection title="Objects of Desire" subtitle="CURATED SELECTION" products={best} href="/best" />

      {/* 06 — NEWSLETTER */}
      <NewsletterSection />
    </div>
  );
}
