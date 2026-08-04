import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PackageCheck, RefreshCcw, ShieldCheck, Truck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME — editorial luxury (CK / Zara register).
 *
 * Type: Helvetica (CK stack) for UI + Instrument Serif italic for editorial
 *       moments — the one "luxury" voice on the page.
 * Palette: alabaster ivory, obsidian ink, ash, hairline line. No borders on
 *       cards, no shadows, no radius — the premium is in the negative space.
 * Motion: one easing curve, opacity/translate only.
 *
 * Sections:
 *   1 Hero (full-bleed B&W campaign)
 *   2 Marquee ticker (brand promises)
 *   3 Category split (Women / Men)
 *   4 Best sellers
 *   5 Editorial split (brand story, serif)
 *   6 Campaign full-bleed (signature edit)
 *   7 Featured pieces
 *   8 Trust row
 *   9 Fit finder CTA
 *   10 Newsletter
 * ========================================================================== */

const serif = { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400 };

const TRUST = [
  { icon: PackageCheck, title: 'Discreet packaging', sub: 'Plain parcel, always' },
  { icon: Truck, title: 'COD nationwide', sub: 'Pay at your door' },
  { icon: RefreshCcw, title: 'Easy 7-day returns', sub: 'No questions asked' },
  { icon: ShieldCheck, title: 'Wash-tested 40 cycles', sub: 'Softness in, softness out' },
];

const MARQUEE = [
  'Made in Pakistan', 'Premium innerwear', 'Discreet packaging', 'COD nationwide',
  'Wash-tested 40 cycles', 'Finished to international standard',
];

export default function Home() {
  const { settings } = useApp();
  const [best, setBest] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [nl, setNl] = useState('');
  const [nlDone, setNlDone] = useState(false);

  useEffect(() => {
    api('/products?bestSeller=true&limit=8').then((d) => setBest(d.products || [])).catch(() => setBest([]));
    api('/products?featured=true&limit=8').then((d) => setFeatured(d.products || [])).catch(() => setFeatured([]));
  }, []);

  const subscribe = (e) => {
    e.preventDefault();
    if (!nl.trim()) return;
    setNlDone(true);
    setNl('');
    // Fire the real subscriber POST — the newsletter list the campaigns use.
    api('/subscribers', { method: 'POST', body: { email: nl.trim() } }).catch(() => {});
  };

  return (
    <div className="bg-alabaster text-obsidian font-sans">
      <Seo title="Premium Innerwear for Men & Women"
        description="Premium innerwear engineered for comfort. Made in Pakistan, finished to international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* ═══ 1. HERO — full-bleed white campaign (CK style) ═════════ */}
      <section className="relative w-full overflow-hidden bg-white" style={{ minHeight: '92vh' }}>
        {/* Full-bleed image — spans left edge to right edge, no bars. */}
        <img src="/images/campaign/hero-women-white.jpg" alt="" fetchpriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center" />
        {/* Subtle bottom veil for text legibility on the bright image */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-white/90 via-white/30 to-transparent" />
        <div className="relative flex min-h-[92vh] items-end">
          <div className="w-full px-5 pb-12 md:px-10 md:pb-20 lg:px-16">
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-ash">Premium innerwear · Made in Pakistan</p>
              <h1 className="mt-5 font-display text-[44px] leading-[1.02] font-medium uppercase tracking-[0.02em] text-obsidian md:text-[88px]">
                Second skin,
                <br />
                <span style={serif} className="normal-case italic tracking-normal">first choice.</span>
              </h1>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-graphite">
                Engineered for comfort. Designed in Pakistan, finished to an international standard.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/women" className="inline-flex min-h-[48px] items-center justify-center bg-obsidian px-9 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-graphite">
                  Shop Women
                </Link>
                <Link to="/men" className="inline-flex min-h-[48px] items-center justify-center border border-obsidian/30 px-9 text-[12px] font-semibold uppercase tracking-[0.14em] text-obsidian transition hover:bg-obsidian hover:text-white">
                  Shop Men
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. MARQUEE — brand promises ═══════════════════════════ */}
      <div className="overflow-hidden border-y border-line bg-obsidian py-3 text-white">
        <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-10 whitespace-nowrap pr-10">
          {[...MARQUEE, ...MARQUEE].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-10 text-[11px] font-medium uppercase tracking-[0.22em] text-white/80">
              {t} <span className="text-clay">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ═══ 3. CATEGORY SPLIT ═════════════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        {[
          { to: '/women', img: '/images/campaign/hero-women-white.jpg', label: 'Women', sub: 'Bras · Panties · Shapewear' },
          { to: '/men', img: '/images/campaign/hero-men-white.jpg', label: 'Men', sub: 'Briefs · Boxers · Trunks' },
        ].map(({ to, img, label, sub }) => (
          <Link key={to} to={to} className="group relative block overflow-hidden bg-line" style={{ aspectRatio: '4/5' }}>
            <img src={img} alt={label} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-7 md:p-12">
              <p className="font-display text-[34px] font-medium uppercase tracking-[0.04em] text-white md:text-[44px]">{label}</p>
              <p className="mt-1 text-[12px] uppercase tracking-[0.16em] text-white/70">{sub}</p>
              <span className="mt-5 inline-flex items-center gap-2 border-b border-white/40 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition group-hover:border-white">
                Explore <ArrowRight size={12} />
              </span>
            </div>
          </Link>
        ))}
      </section>

      {/* ═══ 4. BEST SELLERS ═══════════════════════════════════════ */}
      {best && best.length > 0 && (
        <section className="bg-alabaster py-16 md:py-24">
          <div className="container">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ash">Loved</p>
                <h2 className="mt-3 font-display text-[28px] font-medium uppercase tracking-[0.03em] md:text-[40px]">Best sellers</h2>
              </div>
              <Link to="/best" className="inline-flex items-center gap-1.5 border-b border-line pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ash transition hover:border-obsidian hover:text-obsidian">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
              {best.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══ 5. EDITORIAL SPLIT — brand story ═══════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div className="relative min-h-[420px] overflow-hidden bg-line">
          <img src="/images/campaign/fabric-cream.jpg" alt="HUSHAE fabric" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="flex items-center bg-cream px-7 py-16 md:px-16">
          <div className="max-w-md">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ash">The house</p>
            <h2 className="mt-4 font-display text-[30px] font-medium uppercase tracking-[0.02em] leading-tight md:text-[42px]">
              Made to be <span style={serif} className="normal-case italic">forgotten.</span>
            </h2>
            <p className="mt-5 text-[14px] leading-relaxed text-ash">
              The best innerwear is the piece you stop noticing by ten in the morning. We cut for that moment — modal that moves, seams that sit flat, elastics that hold without pressing.
            </p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-ash">Designed and made in Pakistan · finished to an international standard</p>
            <Link to="/about" className="mt-7 inline-flex items-center gap-2 border-b border-obsidian/30 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-obsidian transition hover:border-obsidian">
              Our standards <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 6. CAMPAIGN FULL-BLEED — signature edit (white collective) ═ */}
      <section className="relative overflow-hidden bg-white text-obsidian">
        <img src="/images/campaign/campaign-wide-white.jpg" alt="The HUSHAE edit" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/85 via-white/20 to-transparent" />
        <div className="relative flex min-h-[70vh] items-end">
          <div className="w-full px-5 pb-12 md:px-10 md:pb-16 lg:px-16">
            <div className="max-w-xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ash">The edit</p>
              <h2 className="mt-4 font-display text-[34px] font-medium uppercase tracking-[0.02em] leading-tight md:text-[56px]">
                Signature <span style={serif} className="normal-case italic">pieces.</span>
              </h2>
              <p className="mt-5 max-w-md text-[14px] leading-relaxed text-graphite">
                The pieces we keep restocking because they keep selling out — cut in our signature modal blend.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/shop?tier=Premium" className="inline-flex min-h-[48px] items-center justify-center bg-obsidian px-9 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-graphite">
                  Shop the edit
                </Link>
                <Link to="/sale" className="inline-flex min-h-[48px] items-center justify-center border border-obsidian/30 px-9 text-[12px] font-semibold uppercase tracking-[0.14em] text-obsidian transition hover:bg-obsidian hover:text-white">
                  Sale
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 7. FEATURED PIECES ════════════════════════════════════ */}
      {featured && featured.length > 0 && (
        <section className="bg-white py-16 md:py-24">
          <div className="container">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ash">New season</p>
                <h2 className="mt-3 font-display text-[28px] font-medium uppercase tracking-[0.03em] md:text-[40px]">Featured pieces</h2>
              </div>
              <Link to="/new" className="inline-flex items-center gap-1.5 border-b border-line pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ash transition hover:border-obsidian hover:text-obsidian">
                New arrivals <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
              {featured.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══ 8. TRUST ROW ══════════════════════════════════════════ */}
      <section className="border-y border-line bg-alabaster">
        <div className="container grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon size={18} className="mt-0.5 shrink-0 text-ash" strokeWidth={1.5} />
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.10em] text-obsidian">{title}</p>
                <p className="mt-0.5 text-[12px] text-ash">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 9. FIT FINDER ═════════════════════════════════════════ */}
      <section className="bg-obsidian py-16 text-center text-white md:py-24">
        <div className="container">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">Size guide</p>
          <h2 className="mt-4 font-display text-[28px] font-medium uppercase tracking-[0.02em] md:text-[40px]">
            Find your <span style={serif} className="normal-case italic">exact</span> fit
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-white/65">
            Four questions. No tape measure. Our Fit Finder works out your true size from the pieces you already own.
          </p>
          <Link to="/fit-finder" className="mt-8 inline-flex min-h-[48px] items-center justify-center bg-white px-9 text-[12px] font-semibold uppercase tracking-[0.14em] text-obsidian transition hover:bg-transparent hover:text-white hover:ring-1 hover:ring-white">
            Start Fit Finder <ArrowRight size={12} className="ml-2" />
          </Link>
        </div>
      </section>

      {/* ═══ 10. NEWSLETTER ════════════════════════════════════════ */}
      <section className="bg-alabaster py-16 md:py-24">
        <div className="container max-w-xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ash">Stay in touch</p>
          <h2 className="mt-3 font-display text-[26px] font-medium uppercase tracking-[0.03em] md:text-[34px]">Join the circle</h2>
          <p className="mt-3 text-[13px] text-ash">Early access to new drops, fit guides and private offers. No spam, ever.</p>
          {nlDone ? (
            <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.14em] text-sagedeep">You&apos;re on the list — welcome.</p>
          ) : (
            <form onSubmit={subscribe} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
              <input type="email" value={nl} onChange={(e) => setNl(e.target.value)} required placeholder="Your email"
                className="min-h-[48px] flex-1 border-b border-line bg-transparent px-2 text-[13px] outline-none transition focus:border-obsidian placeholder:text-ash" />
              <button type="submit" className="min-h-[48px] bg-obsidian px-8 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-graphite">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
