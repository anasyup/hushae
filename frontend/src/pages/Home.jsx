import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME — "Quiet Luxury" editorial.
 *
 * The reference is not "a fashion site" but the art direction of SKIMS / COS /
 * Zara: restraint, negative space, one strong visual voice, editorial type.
 *
 * Deliberate absences (what makes it feel premium, not template-y):
 *   · NO marquee ticker
 *   · NO image category tiles (they read as stocky "shop by category")
 *   · NO second product rail — one "edit" only
 *   · NO badges, chips, or decoration
 *
 * Instead:
 *   · one art-directed hero on warm ivory
 *   · a numbered campaign index (01 · 02 · 03) — an editorial device, not a menu
 *   · one product rail ("The Edit")
 *   · one editorial statement, serif italic
 *   · trust as a single quiet line, not four boxes
 * ========================================================================== */

const serif = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400 };

/* ── Campaign index — the numbered editorial device ─────────────────────── */
const CAMPAIGN = [
  { no: '01', label: 'For Her', sub: 'Bras · Panties · Shapewear', img: '/images/campaign/essentials-01.jpg', href: '/women' },
  { no: '02', label: 'For Him', sub: 'Briefs · Boxers · Trunks', img: '/images/campaign/essentials-02.jpg', href: '/men' },
  { no: '03', label: 'The Fabric', sub: 'Modal · Cotton · Stretch', img: '/images/campaign/detail-01.jpg', href: '/about' },
];

const TRUST_LINE = 'Discreet packaging · COD nationwide · 7-day returns · Wash-tested 40 cycles';

export default function Home() {
  const { settings } = useApp();
  const [best, setBest] = useState(null);
  const [nl, setNl] = useState('');
  const [nlDone, setNlDone] = useState(false);

  useEffect(() => {
    api('/products?bestSeller=true&limit=8').then((d) => setBest(d.products || [])).catch(() => setBest([]));
  }, []);

  const subscribe = (e) => {
    e.preventDefault();
    if (!nl.trim()) return;
    setNlDone(true);
    setNl('');
    api('/subscribers', { method: 'POST', body: { email: nl.trim() } }).catch(() => {});
  };

  return (
    <div className="bg-alabaster text-obsidian font-sans">
      <Seo title="Premium Innerwear for Men & Women"
        description="Premium innerwear engineered for comfort. Made in Pakistan, finished to international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* ═══ 01 — HERO: art-directed, quiet ═══════════════════════ */}
      <section className="relative w-full overflow-hidden bg-alabaster" style={{ minHeight: '100vh' }}>
        <img src="/images/campaign/essentials-01.jpg" alt="" fetchpriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center" />
        {/* Hairline-grade veils — barely there, keeps the type legible */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-alabaster/80 via-alabaster/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-alabaster/90 via-alabaster/35 to-transparent" />

        {/* Editorial index — top right, tiny */}
        <div className="absolute right-6 top-24 hidden items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-obsidian/60 md:flex">
          <span className="h-px w-8 bg-obsidian/40" /> 01 — The Essentials Edit
        </div>

        <div className="relative flex min-h-screen items-end">
          <div className="w-full px-6 pb-14 md:px-12 md:pb-20 lg:px-20">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-ash">New Season · Made in Pakistan</p>
            <h1 className="mt-6 font-display text-[46px] leading-[0.98] font-medium uppercase tracking-[0.01em] text-obsidian md:text-[100px] lg:text-[120px]">
              Second
              <br />
              <span style={serif} className="normal-case italic font-normal tracking-normal">skin.</span>
            </h1>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Link to="/women" className="inline-flex min-h-[52px] items-center justify-center bg-obsidian px-10 text-[12px] font-semibold uppercase tracking-[0.18em] text-alabaster transition-colors duration-base hover:bg-graphite">
                Shop Women
              </Link>
              <Link to="/men" className="group inline-flex min-h-[52px] items-center justify-center border-b border-obsidian/30 text-[12px] font-semibold uppercase tracking-[0.18em] text-obsidian transition-colors duration-base hover:border-obsidian">
                Shop Men <ArrowRight size={13} className="ml-2 transition-transform duration-base group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 02 — CAMPAIGN INDEX (numbered editorial) ═════════════ */}
      <section className="bg-alabaster py-20 md:py-28">
        <div className="container">
          <div className="mb-12 flex items-end justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-ash">The Campaign</p>
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-ash/70">Index</span>
          </div>
          <div className="grid grid-cols-1 gap-px bg-line md:grid-cols-3">
            {CAMPAIGN.map((c) => (
              <Link key={c.no} to={c.href} className="group relative block bg-alabaster">
                <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
                  <img src={c.img} alt={c.label} loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]"
                    style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }} />
                  <span className="absolute left-5 top-5 font-display text-[13px] font-medium uppercase tracking-[0.2em] text-obsidian">{c.no}</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-line py-5">
                  <div>
                    <p className="font-display text-[20px] font-medium uppercase tracking-[0.06em] text-obsidian md:text-[24px]">{c.label}</p>
                    <p className="mt-1 text-[12px] uppercase tracking-[0.16em] text-ash">{c.sub}</p>
                  </div>
                  <ArrowUpRight size={18} className="text-ash transition-transform duration-base group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 04 — THE EDIT (single curated rail) ══════════════════ */}
      {best && best.length > 0 && (
        <section className="border-t border-line bg-white py-20 md:py-28">
          <div className="container">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-ash">The Edit</p>
                <h2 className="mt-4 font-display text-[28px] font-medium uppercase tracking-[0.02em] md:text-[44px]">
                  Best <span style={serif} className="normal-case italic font-normal tracking-normal">sellers.</span>
                </h2>
              </div>
              <Link to="/best" className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-ash transition-colors duration-base hover:text-obsidian">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4 md:gap-x-8">
              {best.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══ 05 — EDITORIAL STATEMENT ════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div className="relative min-h-[480px] overflow-hidden bg-line">
          <img src="/images/campaign/campaign-01.jpg" alt="The HUSHAE house" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="flex items-center bg-cream px-8 py-20 md:px-16 lg:px-20">
          <div className="max-w-md">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-ash">The House</p>
            <p className="mt-8 font-display text-[28px] leading-[1.25] font-normal text-obsidian md:text-[36px]">
              <span style={serif} className="italic">"The best innerwear is the piece you stop noticing</span>{' '}
              by ten in the morning.
            </p>
            <p className="mt-8 text-[14px] leading-relaxed text-ash">
              We cut for that moment — modal that moves, seams that sit flat, elastics that hold without pressing. Designed and made in Pakistan, finished to an international standard.
            </p>
            <Link to="/about" className="group mt-9 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-obsidian">
              Our standards <ArrowRight size={12} className="transition-transform duration-base group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 06 — SIGNATURE CAMPAIGN (full-bleed, quiet) ═════════ */}
      <section className="relative overflow-hidden bg-alabaster">
        <img src="/images/campaign/essentials-02.jpg" alt="For him" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-alabaster/95 via-alabaster/40 to-transparent" />
        <div className="relative flex min-h-[80vh] items-end">
          <div className="w-full px-6 pb-14 md:px-12 md:pb-20 lg:px-20">
            <div className="max-w-xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-ash">02 — For Him</p>
              <h2 className="mt-5 font-display text-[34px] font-medium uppercase tracking-[0.02em] leading-tight md:text-[56px]">
                Considered <span style={serif} className="normal-case italic font-normal tracking-normal">comfort.</span>
              </h2>
              <p className="mt-5 max-w-md text-[14px] leading-relaxed text-graphite">
                Briefs, boxers and trunks cut on a stretch blend that keeps its shape — the size you buy is the size you wear a year later.
              </p>
              <Link to="/men" className="group mt-8 inline-flex min-h-[52px] items-center justify-center bg-obsidian px-10 text-[12px] font-semibold uppercase tracking-[0.18em] text-alabaster transition-colors duration-base hover:bg-graphite">
                Shop Men <ArrowRight size={13} className="ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 07 — TRUST: one quiet line ═══════════════════════════ */}
      <section className="border-t border-line bg-alabaster">
        <div className="container flex flex-col items-center justify-between gap-3 py-8 text-center md:flex-row md:text-left">
          <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-ash">{TRUST_LINE}</p>
          <Link to="/faq" className="text-[10px] font-semibold uppercase tracking-[0.26em] text-obsidian/60 transition-colors duration-base hover:text-obsidian">
            Questions? Read our FAQ
          </Link>
        </div>
      </section>

      {/* ═══ 08 — FIT FINDER ══════════════════════════════════════ */}
      <section className="border-t border-line bg-alabaster py-20 text-center md:py-28">
        <div className="container max-w-xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-ash">The Fit Finder</p>
          <h2 className="mt-5 font-display text-[28px] font-medium uppercase tracking-[0.02em] md:text-[40px]">
            Four questions, <span style={serif} className="normal-case italic font-normal tracking-normal">exact</span> fit.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[14px] leading-relaxed text-ash">
            No tape measure. Our Fit Finder works out your true size from the pieces you already own.
          </p>
          <Link to="/fit-finder" className="group mt-8 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-obsidian">
            Start the Fit Finder <ArrowRight size={13} className="transition-transform duration-base group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ═══ 09 — NEWSLETTER ══════════════════════════════════════ */}
      <section className="border-t border-line bg-obsidian py-16 text-center text-alabaster md:py-20">
        <div className="container max-w-xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-alabaster/50">Stay in touch</p>
          <h2 className="mt-4 font-display text-[24px] font-medium uppercase tracking-[0.04em] md:text-[30px]">The Inner Circle</h2>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-alabaster/60">
            Early access to new drops, fit guides and private offers. No spam, ever.
          </p>
          {nlDone ? (
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-alabaster">You&apos;re on the list — welcome.</p>
          ) : (
            <form onSubmit={subscribe} className="mx-auto mt-8 flex max-w-md flex-col gap-4 sm:flex-row sm:items-end">
              <input type="email" value={nl} onChange={(e) => setNl(e.target.value)} required placeholder="Your email"
                className="min-h-[52px] w-full min-w-0 flex-1 border-0 border-b border-alabaster/30 bg-transparent pb-2 text-[14px] text-alabaster outline-none transition-colors duration-base placeholder:text-alabaster/40 focus:border-alabaster" />
              <button type="submit" className="min-h-[52px] shrink-0 border border-alabaster/50 px-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-alabaster transition-colors duration-base hover:bg-alabaster hover:text-obsidian">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
