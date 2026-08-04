import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
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
  { label: 'For Her', sub: 'Bras · Panties · Shapewear', img: '/images/campaign/hushae-hero-women.jpg', href: '/women' },
  { label: 'For Him', sub: 'Briefs · Boxers · Trunks', img: '/images/campaign/hushae-hero-men.jpg', href: '/men' },
  { label: 'The Fabric', sub: 'Modal · Cotton · Stretch', img: '/images/campaign/hushae-fabric.jpg', href: '/about' },
];

const PERKS = ['Discreet packaging', 'COD nationwide', '7-day returns', 'Wash-tested 40 cycles'];

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

  useEffect(() => {
    api('/products?newArrival=true&limit=8').then((d) => setFresh(d.products || [])).catch(() => setFresh([]));
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

      {/* ═══ 01 — HERO: full-bleed, enormous type ══════════════════ */}
      <section className="relative w-full overflow-hidden bg-white" style={{ minHeight: '100vh' }}>
        <img src="/images/campaign/hushae-hero-women.jpg" alt="" fetchpriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center" />
        {/* Light veils — the hero image is bright, so the type is BLACK */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-alabaster/80 via-alabaster/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-alabaster/95 via-alabaster/40 to-transparent" />

        <div className="relative flex min-h-screen items-end">
          <div className="w-full px-5 pb-16 md:px-12 md:pb-24 lg:px-20">
            <p className="text-[11px] font-medium uppercase tracking-[0.34em] text-graphite">Premium innerwear · Made in Pakistan</p>
            <h1 className="mt-6 font-display text-[52px] font-bold uppercase leading-[0.92] tracking-[-0.01em] text-obsidian md:text-[120px] lg:text-[150px]">
              Second
              <br />
              Skin
            </h1>
            <p className="mt-7 max-w-md text-[15px] leading-relaxed text-graphite">
              Engineered for comfort. Designed in Pakistan, finished to an international standard.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/women"
                className="inline-flex min-h-[56px] items-center justify-center bg-obsidian px-12 text-[13px] font-bold uppercase tracking-[0.18em] text-white transition-colors duration-base hover:bg-graphite">
                Shop Women
              </Link>
              <Link to="/men"
                className="group inline-flex min-h-[56px] items-center justify-center border-b border-obsidian/40 px-2 text-[13px] font-bold uppercase tracking-[0.18em] text-obsidian transition-colors duration-base hover:border-obsidian">
                Shop Men <ArrowRight size={14} className="ml-2 transition-transform duration-base group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 02 — TRAY ROW (CK: image + label below) ═══════════════ */}
      <section className="bg-white py-20 md:py-28">
        <div className="container">
          <div className="mb-12 flex items-baseline justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-obsidian">The Campaign</p>
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-ash">01 — 03</span>
          </div>
        </div>
        {/* Full-bleed, zero gap — trays stretch edge to edge with a 1px hairline */}
        <div className="grid grid-cols-1 gap-px bg-line md:grid-cols-3">
          {TRAYS.map((t) => (
            <Link key={t.label} to={t.href} className="group block bg-white">
              <div className="relative overflow-hidden bg-line" style={{ aspectRatio: '4/5' }}>
                <img src={t.img} alt={t.label} loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.1s] group-hover:scale-[1.05]"
                  style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }} />
              </div>
              <div className="flex items-baseline justify-between px-5 py-6 md:px-8">
                <div>
                  <p className="font-display text-[20px] font-bold uppercase tracking-[0.06em] text-obsidian md:text-[24px]">{t.label}</p>
                  <p className="mt-1.5 text-[12px] uppercase tracking-[0.18em] text-ash">{t.sub}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-obsidian transition-colors duration-base group-hover:border-obsidian group-hover:bg-obsidian group-hover:text-white">
                  <ArrowUpRight size={16} strokeWidth={1.6} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ 03 — JUST IN (product rail — CK "Just In") ════════════ */}
      {fresh && fresh.length > 0 && (
        <section className="border-t border-line bg-white py-20 md:py-28">
          <div className="container">
            <div className="mb-12 flex items-end justify-between">
              <h2 className="font-display text-[30px] font-bold uppercase tracking-[0.02em] text-obsidian md:text-[48px]">
                Just <span className="text-[#D50000]">In</span>
              </h2>
              <Link to="/new" className="group inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-obsidian">
                Shop all <ArrowRight size={13} className="transition-transform duration-base group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4 md:gap-x-8">
              {fresh.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══ 04 — EDITORIAL STATEMENT (big typographic moment) ═════ */}
      <section className="border-t border-line bg-alabaster py-24 md:py-36">
        <div className="container max-w-4xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-ash">The House</p>
          <p className="mt-10 font-display text-[34px] font-medium uppercase leading-[1.08] tracking-[0.01em] text-obsidian md:text-[64px]">
            The best innerwear is the piece you stop noticing by ten in the morning.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-8">
            <p className="max-w-sm text-[14px] leading-relaxed text-ash">
              Modal that moves. Seams that sit flat. Elastics that hold without pressing. Designed and made in Pakistan, finished to an international standard.
            </p>
            <Link to="/about" className="group inline-flex items-center gap-2 border-b border-obsidian pb-1 text-[12px] font-semibold uppercase tracking-[0.22em] text-obsidian">
              Our standards <ArrowRight size={13} className="transition-transform duration-base group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 05 — CAMPAIGN FULL-BLEED (For Him) ════════════════════ */}
      <section className="relative overflow-hidden bg-white">
        <img src="/images/campaign/hushae-hero-men.jpg" alt="For him" loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-center" />
        {/* Bright image → light veil + BLACK type */}
        <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-alabaster/95 via-alabaster/40 to-transparent" />
        <div className="relative flex min-h-[85vh] items-end">
          <div className="w-full px-5 pb-16 md:px-12 md:pb-24 lg:px-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-graphite">For Him · New Season</p>
            <h2 className="mt-6 font-display text-[40px] font-bold uppercase leading-[0.95] tracking-[-0.01em] text-obsidian md:text-[90px]">
              Considered
              <br />
              Comfort
            </h2>
            <p className="mt-6 max-w-md text-[14px] leading-relaxed text-graphite">
              Briefs, boxers and trunks cut on a stretch blend that keeps its shape — the size you buy is the size you wear a year later.
            </p>
            <Link to="/men"
              className="group mt-9 inline-flex min-h-[56px] items-center justify-center border border-obsidian px-12 text-[13px] font-bold uppercase tracking-[0.18em] text-obsidian transition-colors duration-base hover:bg-obsidian hover:text-white">
              Shop Men <ArrowRight size={14} className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 06 — PERKS (one line, CK style) ═══════════════════════ */}
      <section className="border-t border-line bg-white">
        <div className="container flex flex-wrap items-center justify-center gap-x-12 gap-y-3 py-8 md:justify-between">
          {PERKS.map((p) => (
            <span key={p} className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ash">{p}</span>
          ))}
        </div>
      </section>

      {/* ═══ 07 — FIT FINDER (image background + animations) ═══════ */}
      <section className="relative overflow-hidden border-t border-line py-20 text-center md:py-32">
        {/* Animated background image — slow Ken Burns zoom */}
        <img src="/images/campaign/hushae-fabric.jpg" alt="" aria-hidden="true" loading="lazy"
          className="absolute inset-0 h-full w-full object-cover animate-[kenburns_22s_ease-in-out_infinite_alternate]" />
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

      {/* ═══ 08 — NEWSLETTER (black, CK sign-up) ═══════════════════ */}
      <section className="bg-black py-20 text-center text-white md:py-28">
        <div className="container max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">Stay in touch</p>
          <h2 className="mt-6 font-display text-[28px] font-bold uppercase tracking-[0.02em] md:text-[44px]">The Inner Circle</h2>
          <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-white/60">
            Early access to new drops, fit guides and private offers. No spam, ever.
          </p>
          {nlDone ? (
            <p className="mt-9 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">You&apos;re on the list — welcome.</p>
          ) : (
            <form onSubmit={subscribe} className="mx-auto mt-9 flex max-w-md flex-col gap-4 sm:flex-row sm:items-end">
              <input type="email" value={nl} onChange={(e) => setNl(e.target.value)} required placeholder="Your email"
                className="min-h-[56px] w-full min-w-0 flex-1 border-0 border-b border-white/30 bg-transparent pb-2 text-[14px] text-white outline-none transition-colors duration-base placeholder:text-white/40 focus:border-white" />
              <button type="submit"
                className="min-h-[56px] shrink-0 bg-white px-10 text-[12px] font-bold uppercase tracking-[0.2em] text-black transition-colors duration-base hover:bg-transparent hover:text-white hover:ring-1 hover:ring-white">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
