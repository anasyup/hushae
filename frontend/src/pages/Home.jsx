import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Banner from '../components/Banner';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME — Calvin Klein anatomy, rebuilt properly.
 *
 * CK's homepage is BOLD, not decorative: one full-bleed hero with enormous
 * Helvetica type, a tray row of clean image tiles, a product rail ("Just In"),
 * an editorial statement, a full-bleed campaign, a perks line, a newsletter.
 * Everything uppercase Helvetica (Family Klein → Neue → Arial), monochrome
 * with CK-red used only for the announcement + sale accents, hairline rules,
 * generous whitespace, subtle zoom/underline hovers. No serif italic
 * decoration — that was the previous miss; CK is a sans-serif house.
 * ========================================================================== */

const CK_RED = '#D50000';

/* ── CK tray row: image tile + label below (Denim / Jackets / Dresses) ───── */
const TRAYS = [
  { label: 'For Her', sub: 'Bras  Panties  Shapewear', img: '/images/campaign/hushae-hero-women.jpg', href: '/women' },
  { label: 'For Him', sub: 'Briefs  Boxers  Trunks', img: '/images/campaign/hushae-hero-men.jpg', href: '/men' },
  { label: 'The Fabric', sub: 'Modal  Cotton  Stretch', img: '/images/campaign/hushae-fabric.jpg', href: '/about' },
];

const TRUST_CARDS = [
  { icon: 'Ruler', title: 'Best Fit Guarantee', text: 'Free size swaps — the right fit, every time.' },
  { icon: 'Truck', title: 'Free Shipping PKR 4,999+', text: 'Nationwide, discreetly packed.' },
  { icon: 'Box', title: 'Discreet Packaging', text: 'Plain parcel, no branding on the outside.' },
];

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
    if (reviews.length >= 4) break;
  }
  return reviews;
}

/* ── Subtle parallax — translates a full-bleed image against its section.
   rAF-throttled, desktop-only (touch devices get nothing — they scroll the
   image normally). Pure transform, so it can't trigger layout. ──────────── */
function useParallax(amount = 60) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(max-width: 767px)').matches) return undefined;
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        // Only parallax while the section is on screen.
        if (rect.bottom < 0 || rect.top > vh) return;
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        el.style.transform = `translateY(${(-progress * amount).toFixed(1)}px) scale(1.06)`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      el.style.transform = '';
    };
  }, [amount]);
  return ref;
}

/* ── Reveal — quiet scroll-into-view animation (fade + rise) ─────────────── */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); io.disconnect(); }
    }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${vis ? 'translate-y-0 opacity-100' : 'translate-y-7 opacity-0'} ${className}`}
      style={{ transitionDelay: `${delay}ms`, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
      {children}
    </div>
  );
}

export default function Home() {
  const { settings } = useApp();
  const [fresh, setFresh] = useState(null);
  const [nl, setNl] = useState('');
  const [nlDone, setNlDone] = useState(false);
  const [nlSeg, setNlSeg] = useState('women');
  const [social, setSocial] = useState([]);

  useEffect(() => {
    api('/products?newArrival=true&limit=8').then((d) => setFresh(d.products || [])).catch(() => setFresh([]));
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

  return (
    <div className="bg-white text-obsidian font-sans">
      <Seo title="Premium Innerwear for Men & Women"
        description="Premium innerwear engineered for comfort. Made in Pakistan, finished to international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* ═══ 01 — HERO: banner-slot driven, cinematic (video-feel) ═══════════ */}
      <section className="relative w-full overflow-hidden bg-white" style={{ minHeight: '100vh' }}>
        <Banner
          slot="homepage-hero"
          className="absolute inset-0 h-full w-full"
          fallback={(
            /* Default hero — cinematic Ken Burns zoom (video-feel, 15s loop),
               until an admin publishes a homepage-hero banner or video. */
            <picture className="absolute inset-0 h-full w-full">
              <source srcSet="/images/campaign/hushae-hero-women.avif" type="image/avif" />
              <source srcSet="/images/campaign/hushae-hero-women.webp" type="image/webp" />
              <img src="/images/campaign/hushae-hero-women.jpg" alt="" fetchpriority="high"
                className="absolute inset-0 h-full w-full object-cover object-center animate-[kenburns_20s_ease-in-out_infinite_alternate]" />
            </picture>
          )}
        />
        {/* LIGHT veil — barely there (15%), CK lets the image shine */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-white/45 via-white/5 to-transparent" />

        <div className="relative flex min-h-screen items-end">
          <div className="w-full px-6 pb-14 md:px-14 md:pb-20 lg:px-24">
            {/* Tiny eyebrow — muted, almost invisible (CK register) */}
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Made in Pakistan</p>
            {/* CK "The Campus Edit": thin (300), tracked (0.15em), sentence case */}
            <h1 className="mt-6 font-sans text-[44px] font-light normal-case leading-[1.1] tracking-[0.15em] text-neutral-900 md:text-[100px] lg:text-[120px]">
              Second
              <br />
              skin
            </h1>
            <div className="mt-10 flex flex-wrap items-center gap-8">
              {/* CDLP "Explore" — thin text links */}
              <Link to="/women" className="group inline-flex items-center gap-2 border-b border-neutral-900/30 pb-1 text-[12px] font-light uppercase tracking-[0.18em] text-neutral-900 transition-colors duration-300 hover:border-neutral-900">
                Explore Women <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link to="/men" className="group inline-flex items-center gap-2 border-b border-neutral-900/30 pb-1 text-[12px] font-light uppercase tracking-[0.18em] text-neutral-900 transition-colors duration-300 hover:border-neutral-900">
                Explore Men <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 02 — TRAY ROW (CK: image + label below, hover zoom + arrow slide) ═══ */}
      <section className="bg-white py-24 md:py-32">
        <div className="container">
          <div className="mb-14 flex items-baseline justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-obsidian">The Campaign</p>
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-ash">01 — 03</span>
          </div>
        </div>
        {/* Full-bleed, zero gap — trays stretch edge to edge with a 1px hairline */}
        <div className="grid grid-cols-1 gap-px bg-line md:grid-cols-3">
          {TRAYS.map((t) => (
            <Link key={t.label} to={t.href} className="group block bg-white">
              <div className="relative overflow-hidden bg-line" style={{ aspectRatio: '4/5' }}>
                <picture className="absolute inset-0 h-full w-full">
                  <source srcSet={t.img.replace('.jpg', '.avif')} type="image/avif" />
                  <source srcSet={t.img.replace('.jpg', '.webp')} type="image/webp" />
                  <img src={t.img} alt={t.label} loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]"
                    style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }} />
                </picture>
                {/* subtle hover overlay */}
                <div className="absolute inset-0 bg-neutral-900/0 transition-colors duration-500 group-hover:bg-neutral-900/10" />
              </div>
              <div className="flex items-end justify-between px-5 py-6 md:px-8">
                <div>
                  <p className="font-sans text-[20px] font-light normal-case tracking-[0.04em] text-neutral-900 md:text-[24px]">{t.label}</p>
                  <p className="mt-1.5 text-[11px] font-light tracking-[0.18em] text-[#707070]">{t.sub}</p>
                  {/* CDLP "Read more" secondary CTA */}
                  <span className="mt-4 inline-flex items-center gap-1.5 border-b border-neutral-900/30 pb-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-900 transition-colors duration-300 group-hover:border-neutral-900">
                    Read more <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EBEBEB] text-neutral-900 transition-all duration-300 group-hover:translate-x-1 group-hover:border-neutral-900 group-hover:bg-neutral-900 group-hover:text-white">
                  <ArrowUpRight size={16} strokeWidth={1.6} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ 03 — JUST IN (product rail — CK "Just In") ════════════ */}
      {fresh && fresh.length > 0 && (
        <section className="border-t border-line bg-white py-24 md:py-32">
          <div className="container">
            <div className="mb-12 flex items-end justify-between">
              <h2 className="font-display text-[30px] font-bold uppercase tracking-[0.02em] text-obsidian md:text-[48px]">
                Just <span className="text-[#D50000]">In</span>
              </h2>
              <Link to="/new" className="group inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-obsidian">
                Explore Collection <ArrowRight size={13} className="transition-transform duration-base group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-14 md:grid-cols-4 md:gap-x-10">
              {fresh.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══ 03b — BELOW PRODUCTS banner slot (admin-controlled) ═══ */}
      <Banner slot="homepage-below" className="aspect-[3/1] w-full bg-alabaster" fallback={null} />

      {/* ═══ 04 — EDITORIAL STATEMENT (big typographic moment) ═════ */}
      <section className="border-t border-[#EBEBEB] bg-[#FAFAFA] py-32 md:py-52">
        <div className="container max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#707070]">The House</p>
          <p className="mt-16 max-w-4xl font-sans text-[26px] font-light leading-[1.7] tracking-[0.02em] text-[#707070] md:text-[44px]">
            The best innerwear is the piece you stop noticing by ten in the morning.
          </p>
          <div className="mt-14 flex flex-wrap items-center gap-8">
            <p className="max-w-sm text-[14px] leading-relaxed text-ash">
              Modal that moves. Seams that sit flat. Elastics that hold without pressing. Designed and made in Pakistan, finished to an international standard.
            </p>
            <Link to="/about" className="group inline-flex items-center gap-2 border-b border-obsidian pb-1 text-[12px] font-semibold uppercase tracking-[0.22em] text-obsidian">
              Our standards <ArrowRight size={13} className="transition-transform duration-base group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 05 — CAMPAIGN FULL-BLEED (For Him, subtle parallax) ═════ */}
      <CampaignSection />

      {/* ═══ 06 — TRUST — Tommy John 3 cards ═══════════════════════ */}
      <section className="border-y border-[#EBEBEB] bg-[#FAFAFA]">
        <div className="container grid grid-cols-1 gap-8 py-10 md:grid-cols-3 md:py-14">
          {TRUST_CARDS.map(({ icon, title, text }) => (
            <div key={title} className="flex items-start gap-4">
              <span className="mt-0.5 text-neutral-400">{icon === 'Truck' ? '🚚' : icon === 'Ruler' ? '📏' : '📦'}</span>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#111111]">{title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#707070]">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 06b — HIGHLY RATED — Tommy John social proof carousel ═══ */}
      {social.length > 0 && (
        <section className="bg-[#FAFAFA]">
          <div className="container py-12 md:py-16">
            <div className="mb-8 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#707070]">Highly Rated</p>
              <p className="mt-2 text-[20px] font-light text-[#111111] md:text-[28px]">Loved by customers across Pakistan</p>
            </div>
            <div className="no-scrollbar -mx-5 flex gap-5 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0">
              {social.map((r, i) => (
                <figure key={i} className="w-[300px] shrink-0 rounded-none border border-[#EBEBEB] bg-white p-6 md:w-[340px]">
                  <div className="flex gap-0.5 text-[13px] text-[#C9A96E]">
                    {Array.from({ length: 5 }).map((_, s) => <span key={s}>{s < r.rating ? '★' : '☆'}</span>)}
                  </div>
                  <blockquote className="mt-3 text-[13px] leading-relaxed text-[#111111]">“{r.body}”</blockquote>
                  <figcaption className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#707070]">
                    {r.name} <span className="font-normal text-neutral-400">· {r.product.replace(/^HUSHAE\s+/i, '')}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ 07 — FIT FINDER (image background + animations) ═══════ */}
      <section className="relative overflow-hidden border-t border-line py-20 text-center md:py-32">
        {/* Animated background image — slow Ken Burns zoom */}
        <picture className="absolute inset-0 h-full w-full">
          <source srcSet="/images/campaign/hushae-fabric.avif" type="image/avif" />
          <source srcSet="/images/campaign/hushae-fabric.webp" type="image/webp" />
          <img src="/images/campaign/hushae-fabric.jpg" alt="" aria-hidden="true" loading="lazy"
            className="absolute inset-0 h-full w-full object-cover animate-[kenburns_22s_ease-in-out_infinite_alternate]" />
        </picture>
        {/* Soft ivory overlay — keeps the black type readable */}
        <div className="absolute inset-0 bg-alabaster/85" />
        <div className="absolute inset-0 bg-gradient-to-b from-alabaster/40 via-transparent to-alabaster/60" />

        <div className="relative container max-w-2xl">
          <Reveal>
            <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-ash">The Fit Finder</p>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="mt-6 font-display text-[32px] font-bold uppercase tracking-[0.01em] text-obsidian md:text-[56px]">
              Four Questions.
              <br />
              <span className="inline-block animate-[ff-underline_1.4s_cubic-bezier(0.22,1,0.36,1)_0.3s_both]">Exact Fit.</span>
            </h2>
          </Reveal>

          {/* Step chips — "buttons on the image", staggered reveal */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {['01 Measure', '02 Compare', '03 Match'].map((s, i) => (
              <Reveal key={s} delay={240 + i * 90}>
                <Link to="/fit-finder"
                  className="inline-flex items-center gap-2 border border-obsidian/25 bg-white/75 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-obsidian backdrop-blur-sm transition-colors duration-base hover:border-obsidian hover:bg-obsidian hover:text-white">
                  {s}
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal delay={520}>
            <p className="mx-auto mt-7 max-w-md text-[14px] leading-relaxed text-graphite">
              No tape measure. Our Fit Finder works out your true size from the pieces you already own.
            </p>
          </Reveal>

          <Reveal delay={640}>
            <Link to="/fit-finder"
              className="group mt-9 inline-flex min-h-[56px] items-center justify-center border border-obsidian bg-white/40 px-12 text-[13px] font-bold uppercase tracking-[0.18em] text-obsidian backdrop-blur-sm transition-colors duration-base hover:bg-obsidian hover:text-white">
              Start the Fit Finder
              <ArrowRight size={14} className="ml-2 transition-transform duration-base group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ═══ 08 — NEWSLETTER — CDLP segmented (WOMEN'S / MEN'S + email) ═══ */}
      <section className="bg-[#111111] py-20 text-center text-white md:py-28">
        <div className="container max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">Stay in touch</p>
          <h2 className="mt-6 font-sans text-[28px] font-light normal-case tracking-[0.08em] md:text-[40px]">The Inner Circle</h2>
          <p className="mx-auto mt-4 max-w-md text-[13px] font-light leading-relaxed text-white/60">
            Early access to new drops, fit guides and private offers. No spam, ever.
          </p>

          {/* Segment pills — WOMEN'S / MEN'S */}
          <div className="mx-auto mt-8 flex w-fit gap-2" role="group" aria-label="Choose your segment">
            {['Women', 'Men'].map((seg) => {
              const on = (nlSeg || 'women') === seg.toLowerCase();
              return (
                <button key={seg} type="button" onClick={() => setNlSeg(seg.toLowerCase())}
                  className={`rounded-full border px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300 ${
                    on ? 'border-white bg-white text-[#111111]' : 'border-white/40 text-white/70 hover:border-white hover:text-white'
                  }`}>
                  {seg}&apos;s
                </button>
              );
            })}
          </div>

          {nlDone ? (
            <p className="mt-9 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">You&apos;re on the list — welcome.</p>
          ) : (
            <form onSubmit={subscribe} className="mx-auto mt-8 flex max-w-md flex-col gap-4 sm:flex-row sm:items-end">
              <input type="email" value={nl} onChange={(e) => setNl(e.target.value)} required placeholder="Your email"
                className="min-h-[52px] w-full min-w-0 flex-1 border-0 border-b border-white/30 bg-transparent pb-2 text-[14px] font-light text-white outline-none transition-colors duration-base placeholder:text-white/40 focus:border-white" />
              <button type="submit"
                className="min-h-[52px] shrink-0 rounded-none bg-white px-10 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#111111] transition-colors duration-300 hover:bg-[#C9A96E] hover:text-white">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

/* ═══ Campaign full-bleed — For Him, with a subtle parallax image ══════════ */
function CampaignSection() {
  const imgRef = useParallax(48);
  return (
    <section className="relative overflow-hidden bg-white">
      <picture ref={imgRef} className="absolute inset-0 h-[115%] w-full will-change-transform">
        <source srcSet="/images/campaign/hushae-hero-men.avif" type="image/avif" />
        <source srcSet="/images/campaign/hushae-hero-men.webp" type="image/webp" />
        <img src="/images/campaign/hushae-hero-men.jpg" alt="For him" loading="lazy"
          className="h-full w-full object-cover object-center" />
      </picture>
      {/* Bright image → light veil + BLACK type */}
      <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-alabaster/95 via-alabaster/40 to-transparent" />
      <div className="relative flex min-h-[85vh] items-end">
        <div className="w-full px-6 pb-16 md:px-14 md:pb-24 lg:px-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-graphite">For Him  New Season</p>
          <h2 className="mt-6 font-display text-[40px] font-bold uppercase leading-[0.95] tracking-[0.12em] text-obsidian md:text-[90px]">
            Considered
            <br />
            Comfort
          </h2>
          <p className="mt-6 max-w-md text-[14px] leading-relaxed text-graphite">
            Briefs, boxers and trunks cut on a stretch blend that keeps its shape — the size you buy is the size you wear a year later.
          </p>
          <Link to="/men"
            className="group mt-9 inline-flex items-center gap-2 border-b border-obsidian/30 pb-1 text-[13px] font-bold uppercase tracking-[0.18em] text-obsidian transition-colors duration-300 hover:border-obsidian">
            Shop Men <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
