import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
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
  { landscape: `${IMG}/hero-new-1.jpg`, portrait: `${IMG}/hero-m-1.jpg` },
  { landscape: `${IMG}/hero-new-2.jpg`, portrait: `${IMG}/hero-m-2.jpg` },
  { landscape: `${IMG}/hero-new-3.jpg`, portrait: `${IMG}/hero-m-3.jpg` },
  { landscape: `${IMG}/hero-new-4.jpg`, portrait: `${IMG}/hero-m-4.jpg` },
];

function HeroSlides() {
  const [idx, setIdx] = useState(0);

  /* Auto-advance every 4.5s — ALWAYS, no hover pause (the merchant wants
     the banner to keep moving). Crossfade is 900ms so the change is clearly
     visible. Slides are preloaded eagerly so the crossfade never shows a
     blank frame. */
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      className="relative aspect-[4/5] w-full overflow-hidden bg-white md:aspect-[16/9]"
      aria-roledescription="carousel"
      aria-label="Campaign highlights"
    >
      {/* Slides — crossfade. Art-directed: portrait crop on mobile (4:5),
          landscape on desktop (16:9) — the photo always FITS, never zooms. */}
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.landscape}
          aria-hidden={i !== idx}
          className={`absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        >
          <picture className="block h-full w-full">
            <source media="(max-width: 767px)" srcSet={s.portrait} />
            <img
              src={s.landscape}
              alt={i === idx ? 'HUSHAE campaign' : ''}
              fetchpriority={i === 0 ? 'high' : 'auto'}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover object-center"
            />
          </picture>
        </div>
      ))}

      {/* Slide arrows — luxury hairline circle (Gucci/Prada register) */}
      <button
        type="button"
        onClick={() => setIdx((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 text-white transition-all duration-300 hover:border-white hover:bg-white hover:text-black md:left-6"
      >
        <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => setIdx((i) => (i + 1) % HERO_SLIDES.length)}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 text-white transition-all duration-300 hover:border-white hover:bg-white hover:text-black md:right-6"
      >
        <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {/* Subtle bottom scrim — keeps the imagery clean; no text overlay. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-24"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 100%)',
        }}
      />

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

/* ── SECTION 2 & 4: Product carousel (CK register — no rules, just air) ──── */
function ProductCarouselSection({ title, subtitle, products, href }) {
  return (
    <section className="px-4 pt-24 pb-10 md:px-8 md:pt-32 md:pb-14">
      <div className="mb-12 space-y-3 px-4 text-center md:px-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
          {subtitle}
        </p>
        <h2 className="text-2xl font-light uppercase tracking-[0.18em] text-[#111111] md:text-[34px]">
          {title}
        </h2>
        <Link
          to={href || '/shop'}
          className="inline-flex min-h-[44px] items-center gap-1 border-b border-black/40 pb-0.5 text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-600 transition-colors hover:border-black hover:text-black"
        >
          View All <span aria-hidden="true">&rarr;</span>
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
    <section className="bg-white px-4 pt-24 pb-16 text-center md:pt-32 md:pb-20">
      <div className="mx-auto max-w-md space-y-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
          Stay in touch
        </p>
        <h2 className="text-2xl font-light uppercase tracking-[0.18em] text-[#111111] md:text-[30px]">
          The Newsletter
        </h2>
        <p className="text-[12px] font-normal leading-relaxed tracking-wide text-neutral-500">
          New arrivals, private sales and seasonal previews — first.
        </p>
        {done ? (
          <p className="pt-4 text-[12px] font-medium uppercase tracking-[0.2em] text-[#111111]">You&apos;re on the list.</p>
        ) : (
          <form
            className="mx-auto flex max-w-sm items-end justify-center gap-3 pt-4"
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
              placeholder="Email address"
              className="w-full border-0 border-b border-black/30 bg-transparent px-0 py-2.5 text-[13px] text-black transition focus:border-black focus:outline-none placeholder:text-[12px] placeholder:tracking-wide placeholder:text-neutral-400"
            />
            <button
              type="submit"
              className="min-h-[44px] shrink-0 border-b border-black/30 pb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-colors hover:border-black"
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
    <div className="min-h-screen w-full bg-white font-sans text-[#111111] selection:bg-black selection:text-white">
      <Seo title="Premium Innerwear for Men & Women"
        description="New season essentials, engineered for comfort. Made in Pakistan, finished to an international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* H1 — visually hidden for SEO (the hero used to carry the only H1;
          it now shows the campaign image alone, so the page keeps its title
          here instead). Screen readers announce it; sighted users never see it. */}
      <h1 className="sr-only">
        HUSHAE — Premium innerwear for men and women, made in Pakistan
      </h1>

      {/* 01 — HERO (CK) */}
      <HeroSlides />

      {/* 02 — DISCOVER — editorial gateway (Chanel / Hermès / CK pattern) */}
      <DiscoverTiles />

      {/* 03 — STUDIO CATEGORY SHOWCASE (Givenchy canvas) */}
      <LuxuryCategoryShowcase />

      {/* 04 — NEW ARRIVALS — luxury grid (editorial header + tabs) */}
      <NewArrivalsSection products={fresh} />

      {/* 04 — VIEW MORE — quiet CK affordance (underlined text, not a button) */}
      <div className="flex w-full justify-center pb-10 md:pb-14">
        <Link to="/shop" className="inline-flex min-h-[44px] items-center gap-1 border-b border-black/50 pb-0.5 text-[11px] font-medium uppercase tracking-[0.25em] text-black transition-colors hover:border-black hover:opacity-60">
          View All <ArrowRight size={14} aria-hidden="true" />
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
