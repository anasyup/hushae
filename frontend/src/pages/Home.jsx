import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ruler, Truck, Package } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Banner from '../components/Banner';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME — "Quiet Architecture".
 *
 * Japanese minimalism × Pakistani craftsmanship × Italian luxury.
 * "Whisper, don't shout. Space is the luxury. Motion reveals, never attacks."
 *
 * The page reads like a book: eight chapters, each numbered 01-08, each
 * counter flicking like a page counter when it scrolls into view (50ms
 * interval, IntersectionObserver). 2px grid seams make the product mosaic
 * feel architectural. Headings are Inter 300; the hero is 200-weight
 * lowercase. Nothing shouts.
 * ========================================================================== */

/* Tommy John-style social proof — "Highly Rated" carousel. Fetches approved
   reviews live (top-rated across products) so it is real, not decorative. */
async function loadSocialProof() {
  const prods = await api('/products?limit=8').catch(() => []);
  const p = Array.isArray(prods) ? prods : (prods.products || []);
  const reviews = [];
  for (const prod of p.slice(0, 6)) {
    const d = await api(`/reviews/product/${prod._id}?limit=1`).catch(() => null);
    const r = d?.reviews?.[0];
    if (r && r.rating >= 4) reviews.push({ name: r.customerName, rating: r.rating, body: r.body, product: prod.name });
    if (reviews.length >= 6) break;
  }
  return reviews;
}

/* ── Reveal — quiet scroll-into-view (fade up 40px, 600ms, luxury ease) ─── */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); io.disconnect(); }
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref}
      className={`transition-all duration-[600ms] ease-luxury will-change-transform ${vis ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── Chapter counter — "01 — SECOND SKIN". Mono, smoke, 64px, right-aligned.
   Flicks through digits (50ms) like a page counter the first time its
   section scrolls into view. ────────────────────────────────────────────── */
function ChapterMarker({ num, name, light = false, className = '' }) {
  const ref = useRef(null);
  const [fl, setFl] = useState(false);
  const [disp, setDisp] = useState(num);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setFl(true); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!fl) return undefined;
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setDisp(String(n % 10));
      if (n >= 10) { clearInterval(t); setDisp(num); }
    }, 50);
    return () => clearInterval(t);
  }, [fl, num]);
  return (
    <div ref={ref} className={`flex items-end justify-end gap-3 ${className}`}>
      <span className={`font-mono text-[48px] font-extralight leading-none tabular-nums md:text-[64px] ${light ? 'text-white/70' : 'text-smoke/70'}`}>{disp}</span>
      <span className={`mb-2 text-[10px] font-medium uppercase tracking-[0.2em] ${light ? 'text-white/60' : 'text-smoke'}`}>— {name}</span>
    </div>
  );
}

/* ── Section heading — Inter 300, Title Case, open tracking ─────────────── */
const H = ({ children, className = '' }) => (
  <h2 className={`font-light normal-case tracking-[0.08em] text-charcoal ${className}`}>{children}</h2>
);

const underline = 'group inline-flex items-center gap-1.5 border-b border-current/30 pb-1 text-[12px] font-medium uppercase tracking-[0.12em] transition-colors duration-300 hover:border-current';

/* ── Campaign triptych — For Her / For Him / The Fabric ─────────────────── */
const TRAYS = [
  { label: 'For Her', cta: 'Explore', img: '/images/campaign/hushae-hero-women.jpg', href: '/women' },
  { label: 'For Him', cta: 'Explore', img: '/images/campaign/hushae-hero-men.jpg', href: '/men' },
  { label: 'The Fabric', cta: 'Read more', img: '/images/campaign/hushae-fabric.jpg', href: '/about' },
];

const TRUST_CARDS = [
  { Icon: Ruler, title: 'Best Fit Guarantee', text: 'Free size swaps — the right fit, every time.' },
  { Icon: Truck, title: 'Free Shipping', text: 'Orders over PKR 4,999 delivered nationwide.' },
  { Icon: Package, title: 'Discreet Packaging', text: 'Plain parcel, no branding on the outside.' },
];

export default function Home() {
  const [fresh, setFresh] = useState(null);
  const [nl, setNl] = useState('');
  const [nlDone, setNlDone] = useState(false);
  const [nlSeg, setNlSeg] = useState('women');
  const [social, setSocial] = useState([]);

  useEffect(() => {
    /* The Essentials — bestsellers first, new arrivals as the fallback. */
    api('/products?bestSeller=true&limit=8')
      .then((d) => {
        const list = d.products || [];
        if (list.length) { setFresh(list); return; }
        api('/products?newArrival=true&limit=8').then((d2) => setFresh(d2.products || [])).catch(() => setFresh([]));
      })
      .catch(() => api('/products?newArrival=true&limit=8').then((d2) => setFresh(d2.products || [])).catch(() => setFresh([])));
  }, []);

  useEffect(() => {
    let alive = true;
    loadSocialProof().then((r) => { if (alive) setSocial(r); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const subscribe = (e) => {
    e.preventDefault();
    if (!nl.trim()) return;
    setNlDone(true);
    setNl('');
    api('/subscribers', { method: 'POST', body: { email: nl.trim() } }).catch(() => {});
  };

  /* ── Social proof carousel — 3 per page, auto-advance every 5s ───────── */
  const PAGE = 3;
  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < social.length; i += PAGE) out.push(social.slice(i, i + PAGE));
    return out;
  }, [social]);
  const [pi, setPi] = useState(0);
  useEffect(() => {
    if (pages.length < 2) return undefined;
    const t = setInterval(() => setPi((i) => (i + 1) % pages.length), 5000);
    return () => clearInterval(t);
  }, [pages.length]);

  return (
    <div className="bg-stone text-charcoal font-sans">
      <Seo title="Premium Innerwear for Men & Women"
        description="Premium innerwear engineered for comfort. Made in Pakistan, finished to international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* ═══ 01 — SECOND SKIN (hero: banner video or still, lowercase 200) ═══ */}
      <section className="relative w-full overflow-hidden bg-stone" style={{ minHeight: '70vh' }}>
        <div className="absolute inset-0 md:min-h-[100vh]">
          <Banner
            slot="homepage-hero"
            className="absolute inset-0 h-full w-full"
            fallback={(
              <picture className="absolute inset-0 h-full w-full">
                <source srcSet="/images/campaign/hushae-hero-women.avif" type="image/avif" />
                <source srcSet="/images/campaign/hushae-hero-women.webp" type="image/webp" />
                <img src="/images/campaign/hushae-hero-women.jpg" alt="" fetchpriority="high"
                  className="absolute inset-0 h-full w-full object-cover object-center animate-[kenburns_20s_ease-in-out_infinite_alternate]" />
              </picture>
            )}
          />
        </div>
        {/* Max 10% black — barely there, only at the foot for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/10 to-transparent" />

        <div className="relative flex min-h-[70vh] items-end md:min-h-[100vh]">
          <div className="w-full px-6 pb-14 md:px-14 md:pb-24 lg:px-24">
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/70 [text-shadow:0_1px_12px_rgba(0,0,0,0.45)]">Made in Pakistan</p>
            <h1 className="mt-6 font-sans text-[clamp(48px,6vw,96px)] font-extralight lowercase leading-[1.05] tracking-[0.12em] text-white [text-shadow:0_2px_32px_rgba(0,0,0,0.5)]">
              second skin
            </h1>
            <p className="mt-6 max-w-md text-[14px] font-light tracking-[0.05em] text-white/80 [text-shadow:0_1px_16px_rgba(0,0,0,0.45)]">
              Engineered in Pakistan. Finished to an international standard.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-8">
              <Link to="/women" className={`${underline} text-white border-white/50 hover:border-white`}>Explore Women <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" /></Link>
              <Link to="/men" className={`${underline} text-white border-white/50 hover:border-white`}>Explore Men <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" /></Link>
            </div>
          </div>
        </div>

        {/* 01 — chapter counter, bottom-right */}
        <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10">
          <ChapterMarker num="01" name="Second Skin" light />
        </div>
      </section>

      {/* ═══ 02 — THE CAMPAIGN (triptych, 2px seams, grayscale-warm) ═══ */}
      <section className="bg-stone py-20 md:py-40">
        <div className="container">
          <Reveal>
            <div className="flex items-baseline justify-between">
              <H className="text-[24px] md:text-[32px]">The Campaign</H>
            </div>
          </Reveal>
        </div>
        <div className="container mt-10 grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-[2px]">
          {TRAYS.map((t, i) => (
            <Reveal key={t.label} delay={i * 120}>
              <Link to={t.href} className="group block">
                <div className="relative overflow-hidden bg-sand" style={{ aspectRatio: '4/5' }}>
                  <picture className="absolute inset-0 h-full w-full">
                    <source srcSet={t.img.replace('.jpg', '.avif')} type="image/avif" />
                    <source srcSet={t.img.replace('.jpg', '.webp')} type="image/webp" />
                    <img src={t.img} alt={t.label} loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover grayscale-[35%] transition-all duration-hover ease-luxury group-hover:scale-[1.02] group-hover:grayscale-0" />
                  </picture>
                  <div className="absolute inset-0 bg-charcoal/0 transition-colors duration-hover group-hover:bg-charcoal/5" />
                </div>
                <div className="flex items-baseline justify-between pt-4">
                  <span className="text-[20px] font-light normal-case tracking-[0.04em] text-charcoal md:text-[24px]">{t.label}</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-smoke transition-colors duration-300 group-hover:text-charcoal">
                    {t.cta} <ArrowRight size={11} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="container mt-14"><ChapterMarker num="02" name="The Campaign" /></div>
      </section>

      {/* ═══ 03 — THE ESSENTIALS (4×2 mosaic, 2px seams) ═══ */}
      {fresh && fresh.length > 0 && (
        <section className="bg-stone pb-20 md:pb-40">
          <div className="container">
            <Reveal>
              <div className="flex items-end justify-between">
                <H className="text-[24px] md:text-[32px]">The Essentials</H>
                <Link to="/best" className={`${underline} text-smoke`}>View All <ArrowRight size={12} /></Link>
              </div>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-[2px]">
              {fresh.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
            <div className="mt-14"><ChapterMarker num="03" name="The Essentials" /></div>
          </div>
        </section>
      )}

      {/* ═══ 03b — BELOW PRODUCTS banner slot (admin-controlled) ═══ */}
      <Banner slot="homepage-below" className="aspect-[3/1] w-full bg-sand" fallback={null} />

      {/* ═══ 04 — THE HOUSE (centered manifesto, 200px+ breathing room) ═══ */}
      <section className="bg-stone py-32 md:py-56">
        <div className="container max-w-[480px] text-center">
          <Reveal>
            <p className="text-[20px] font-light leading-[1.8] tracking-[0.01em] text-smoke md:text-[24px]">
              The best innerwear is the piece you stop noticing by ten in the morning.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <p className="mx-auto mt-8 max-w-sm text-[14px] leading-relaxed text-smoke/80">
              Modal that moves. Seams that sit flat. Elastics that hold without pressing. Designed and made in Pakistan, finished to an international standard.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <Link to="/about" className={`${underline} mt-12 inline-flex text-smoke`}>Our Standards <ArrowRight size={12} /></Link>
          </Reveal>
          <ChapterMarker num="04" name="The House" className="mt-20" />
        </div>
      </section>

      {/* ═══ 05 — CONSIDERED COMFORT (50/50 split, grayscale, 120px pad) ═══ */}
      <section className="bg-pearl">
        <div className="grid md:grid-cols-2">
          <div className="relative min-h-[55vh] overflow-hidden md:min-h-[80vh]">
            <picture className="absolute inset-0 h-full w-full">
              <source srcSet="/images/campaign/hushae-hero-men.avif" type="image/avif" />
              <source srcSet="/images/campaign/hushae-hero-men.webp" type="image/webp" />
              <img src="/images/campaign/hushae-hero-men.jpg" alt="For him" loading="lazy"
                className="absolute inset-0 h-full w-full object-cover object-center grayscale" />
            </picture>
          </div>
          <div className="flex flex-col justify-center px-6 py-16 md:px-16 lg:px-[120px] md:py-[120px]">
            <Reveal>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-smoke">For Him · New Season</p>
              <H className="mt-5 text-[28px] md:text-[40px]">Considered Comfort</H>
              <p className="mt-6 max-w-md text-[14px] leading-relaxed text-smoke">
                Briefs, boxers and trunks cut on a stretch blend that keeps its shape — the size you buy is the size you wear a year later.
              </p>
              <Link to="/men" className={`${underline} mt-8 inline-flex text-smoke`}>Explore Men <ArrowRight size={12} /></Link>
            </Reveal>
            <ChapterMarker num="05" name="Considered Comfort" className="mt-16" />
          </div>
        </div>
      </section>

      {/* ═══ 06 — THE PROMISE (floating trust cards, gold line icons) ═══ */}
      <section className="bg-stone py-20 md:py-40">
        <div className="container">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {TRUST_CARDS.map(({ Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 120} className="flex flex-col items-center text-center">
                <Icon size={32} strokeWidth={1.5} className="text-gold" aria-hidden="true" />
                <p className="mt-5 text-[14px] font-medium text-charcoal">{title}</p>
                <p className="mt-2 max-w-[26ch] text-[12px] leading-relaxed text-smoke">{text}</p>
              </Reveal>
            ))}
          </div>
          <ChapterMarker num="06" name="The Promise" className="mt-16" />
        </div>
      </section>

      {/* ═══ 07 — THE WORD (social proof carousel, auto-advance 5s) ═══ */}
      {social.length > 0 && (
        <section className="bg-sand py-20 md:py-40">
          <div className="container relative">
            {/* 07 — chapter counter, top-right of the section */}
            <ChapterMarker num="07" name="The Word" className="absolute right-0 top-0" />
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-smoke">Highly Rated</p>
              <p className="mt-3 text-[24px] font-light normal-case tracking-[0.08em] text-charcoal md:text-[32px]">The Word</p>
            </div>

            {/* mobile — native snap scroll */}
            <div className="no-scrollbar -mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 md:hidden">
              {social.map((r, i) => <ReviewCard key={i} r={r} className="w-[85%] shrink-0 snap-center" />)}
            </div>
            {/* desktop — auto-advancing 3-up carousel */}
            <div className="mt-10 hidden overflow-hidden md:block">
              <div
                className="flex transition-transform duration-[600ms] ease-luxury"
                style={{ transform: `translateX(-${pi * 100}%)` }}
              >
                {pages.map((pg, i) => (
                  <div key={i} className="grid w-full shrink-0 grid-cols-3 gap-6">
                    {pg.map((r, j) => <ReviewCard key={j} r={r} />)}
                  </div>
                ))}
              </div>
            </div>
            {pages.length > 1 && (
              <div className="mt-10 hidden justify-center gap-2 md:flex">
                {pages.map((_, i) => (
                  <button key={i} type="button" onClick={() => setPi(i)}
                    aria-label={`Show reviews page ${i + 1}`}
                    className={`h-1 w-6 transition-colors duration-300 ${i === pi ? 'bg-charcoal' : 'bg-clay'}`} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ 08 — THE INNER CIRCLE (borderless newsletter, arrow submit) ═══ */}
      <section className="bg-stone py-20 md:py-40">
        <div className="container max-w-[480px] text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-smoke">Stay in touch</p>
          <H className="mt-5 text-[28px] md:text-[40px]">The Inner Circle</H>
          <p className="mx-auto mt-4 max-w-sm text-[13px] font-light leading-relaxed text-smoke">
            Early access to new drops, fit guides and private offers. No spam, ever.
          </p>

          {/* Segment pills — WOMEN'S / MEN'S */}
          <div className="mx-auto mt-8 flex w-fit gap-2" role="group" aria-label="Choose your segment">
            {['Women', 'Men'].map((seg) => {
              const on = (nlSeg || 'women') === seg.toLowerCase();
              return (
                <button key={seg} type="button" onClick={() => setNlSeg(seg.toLowerCase())}
                  className={`rounded-full border px-6 py-2 text-[10px] font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${
                    on ? 'border-charcoal bg-charcoal text-white' : 'border-charcoal/25 text-smoke hover:border-charcoal hover:text-charcoal'
                  }`}>
                  {seg}&apos;s
                </button>
              );
            })}
          </div>

          {nlDone ? (
            <p className="mt-9 text-[10px] font-medium uppercase tracking-[0.2em] text-charcoal">You&apos;re on the list — welcome.</p>
          ) : (
            <form onSubmit={subscribe} className="mx-auto mt-10 flex items-end gap-4">
              <input type="email" value={nl} onChange={(e) => setNl(e.target.value)} required placeholder="Your email"
                className="min-h-[44px] w-full min-w-0 flex-1 border-0 border-b border-clay bg-transparent pb-2 text-[14px] font-light text-charcoal outline-none transition-colors duration-base placeholder:text-smoke/70 focus:border-charcoal" />
              <button type="submit" aria-label="Subscribe"
                className="grid h-10 w-10 shrink-0 place-items-center text-smoke transition-colors duration-300 hover:text-charcoal">
                <ArrowRight size={18} strokeWidth={1.5} />
              </button>
            </form>
          )}
          <p className="mt-3 text-[10px] tracking-[0.04em] text-smoke">No spam, ever. Unsubscribe anytime.</p>
          <ChapterMarker num="08" name="The Inner Circle" className="mt-14" />
        </div>
      </section>
    </div>
  );
}

/* ── Review card — stone surface, gold stars, italic quote ──────────────── */
function ReviewCard({ r, className = '' }) {
  return (
    <figure className={`bg-stone p-6 md:p-8 ${className}`}>
      <div className="flex gap-0.5 text-[13px] text-gold">
        {Array.from({ length: 5 }).map((_, s) => <span key={s}>{s < r.rating ? '★' : '☆'}</span>)}
      </div>
      <blockquote className="mt-4 text-[14px] italic leading-relaxed text-charcoal">“{r.body}”</blockquote>
      <figcaption className="mt-5 text-[11px] font-medium uppercase tracking-[0.12em] text-smoke">
        {r.name} <span className="font-normal text-smoke/70">· {r.product.replace(/^HUSHAE\s+/i, '')}</span>
      </figcaption>
    </figure>
  );
}
