import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Banner from '../components/Banner';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME — Calvin Klein register.
 * Clean white / black / gray. Editorial imagery. No rounded template cards,
 * no sage, no shadows. Photography carries the page; the UI stays quiet.
 * ========================================================================== */

const fadeUp = { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.6 } };

const IMG = '/images/campaign/qa';

/* Shop by category — image tiles with name + arrow (CK shop cards) */
const CATS = [
  { label: 'Women', img: `${IMG}/cat-women.jpg`, href: '/women' },
  { label: 'Men', img: `${IMG}/cat-men.jpg`, href: '/men' },
  { label: 'Underwear', img: `${IMG}/cat-underwear.jpg`, href: '/shop' },
  { label: 'New Arrivals', img: `${IMG}/hero-fabric.jpg`, href: '/new' },
];

/* Promotional fallback tile — shows when no admin banner is published */
function PromoTile({ img, eyebrow, title, sub, cta, to }) {
  return (
    <Link to={to} className="group relative block h-full w-full overflow-hidden bg-white">
      <img src={img} alt={title} loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-center px-7 md:px-12">
        {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9A96E]">{eyebrow}</p>}
        <h3 className="mt-2 max-w-md text-2xl font-medium text-white md:text-4xl">{title}</h3>
        {sub && <p className="mt-2 max-w-md text-[13px] text-white/85">{sub}</p>}
        <span className="mt-6 inline-flex min-h-[44px] w-fit items-center justify-center bg-white px-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition-colors duration-300 hover:bg-[#C9A96E] hover:text-white">
          {cta}
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const [best, setBest] = useState(null);
  const [fresh, setFresh] = useState(null);

  useEffect(() => {
    api('/products?bestSeller=true&limit=8').then((d) => setBest(d.products)).catch(() => setBest([]));
    api('/products?newArrival=true&limit=8').then((d) => setFresh(d.products)).catch(() => setFresh([]));
  }, []);

  return (
    <div className="bg-white font-sans text-[#111111]">
      <Seo title="Premium Innerwear for Men & Women"
        description="New season essentials, engineered for comfort. Made in Pakistan, finished to an international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* ═══ HERO — full-bleed editorial ════════════════════════════ */}
      <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden bg-white">
        <img
          src={`${IMG}/hero-women.jpg`}
          alt="Second skin"
          fetchpriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/80 [text-shadow:0_1px_16px_rgba(0,0,0,0.4)]">
            The New Edit
          </p>
          <h1 className="mt-6 text-[clamp(40px,7vw,80px)] font-light uppercase leading-[1.04] tracking-[0.14em] [text-shadow:0_2px_32px_rgba(0,0,0,0.45)]">
            Second
            <br />
            Skin
          </h1>
          <p className="mt-6 text-[13px] font-light tracking-[0.12em] text-white/85 [text-shadow:0_1px_12px_rgba(0,0,0,0.4)]">
            Engineered in Pakistan. Finished to an international standard.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-10">
            <Link to="/women" className="group inline-flex items-center gap-2 border-b border-white/40 pb-1 text-[12px] font-medium uppercase tracking-[0.18em] text-white transition-colors duration-300 hover:border-white">
              Shop Women <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link to="/men" className="group inline-flex items-center gap-2 border-b border-white/40 pb-1 text-[12px] font-medium uppercase tracking-[0.18em] text-white transition-colors duration-300 hover:border-white">
              Shop Men <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ TRUST — quiet hairline row ═════════════════════════════ */}
      <section className="border-b border-[#E5E5E5]">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-[#E5E5E5] px-4 md:px-8">
          {[
            ['Free Shipping', 'On orders over PKR 4,999'],
            ['Discreet Packaging', 'Plain, unmarked parcels'],
            ['14-Day Exchange', 'Free size swaps'],
          ].map(([h, t]) => (
            <div key={h} className="px-4 py-6 text-center md:py-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#111111]">{h}</p>
              <p className="mt-1 text-[11px] text-[#707070]">{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PROMOTIONS — hero banners with buttons (admin) ═════════ */}
      <section className="mx-auto mt-16 max-w-7xl px-4 md:mt-24 md:px-8">
        <motion.div {...fadeUp} className="mb-8 flex items-baseline justify-between border-t border-[#E5E5E5] pt-5">
          <h2 className="text-[22px] font-light uppercase tracking-[0.14em] text-[#111111] md:text-[28px]">Promotions</h2>
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-[#707070] md:block">This Week</span>
        </motion.div>

        <Banner
          slot="homepage-promo-1"
          className="aspect-[16/9] w-full overflow-hidden md:aspect-[21/8]"
          fallback={(
            <PromoTile
              img={`${IMG}/editorial-modern.jpg`}
              eyebrow="The Summer Edit"
              title="Signature comfort, up to 30% off"
              sub="The pieces that define the season — now at their quiet best."
              cta="Shop Sale"
              to="/sale"
            />
          )}
        />
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Banner
            slot="homepage-promo-2"
            className="aspect-[16/10] w-full overflow-hidden"
            fallback={(
              <PromoTile img={`${IMG}/hero-women.jpg`} eyebrow="New Arrivals" title="The Second Skin collection" sub="Featherweight layers, zero-dig fits." cta="Shop New" to="/new" />
            )}
          />
          <Banner
            slot="homepage-promo-3"
            className="aspect-[16/10] w-full overflow-hidden"
            fallback={(
              <PromoTile img={`${IMG}/hero-fabric.jpg`} eyebrow="Free Shipping" title="Over PKR 4,999 — nationwide" sub="Discreet, unmarked packaging on every order." cta="Explore" to="/women" />
            )}
          />
        </div>
      </section>

      {/* ═══ SHOP BY CATEGORY — image tiles ═════════════════════════ */}
      <section className="mx-auto mt-16 max-w-7xl px-4 md:mt-24 md:px-8">
        <motion.div {...fadeUp} className="mb-8 flex items-baseline justify-between border-t border-[#E5E5E5] pt-5">
          <h2 className="text-[22px] font-light uppercase tracking-[0.14em] text-[#111111] md:text-[28px]">Shop by Category</h2>
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-[#707070] md:block">01 — 04</span>
        </motion.div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {CATS.map((c, idx) => (
            <Link key={c.label} to={c.href} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden bg-[#FAFAFA]">
                <img src={c.img} alt={c.label} loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                <span className="absolute left-3 top-3 font-mono text-[10px] tracking-[0.2em] text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between px-0.5">
                <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-[#111111]">{c.label}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#707070] transition-colors duration-300 group-hover:text-[#111111]">
                  Shop Now <ArrowRight size={11} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ CAMPAIGN — Modern Classics ═════════════════════════════ */}
      <section className="mt-16 md:mt-24">
        <Link to="/women" className="group relative block h-[70vh] min-h-[420px] overflow-hidden bg-white">
          <img src={`${IMG}/editorial-modern.jpg`} alt="Modern Classics" loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/75">The Icon Edit</p>
              <h2 className="mt-4 text-[clamp(28px,4vw,46px)] font-light uppercase leading-[1.08] tracking-[0.14em] [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
                Modern Classics
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[13px] font-light leading-[1.8] text-white/85">
                The pieces that define the season. Timeless silhouettes, elevated fabrics.
              </p>
              <span className="mt-8 inline-flex items-center gap-2 border-b border-white/40 pb-1 text-[12px] font-medium uppercase tracking-[0.18em] text-white transition-colors duration-300 group-hover:border-white">
                Discover <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ═══ BEST SELLERS ═══════════════════════════════════════════ */}
      {best && best.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 md:mt-24 md:px-8">
          <motion.div {...fadeUp} className="mb-8 flex items-baseline justify-between border-t border-[#E5E5E5] pt-5">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#707070]">Trending Now</p>
              <h2 className="mt-2 text-[22px] font-light uppercase tracking-[0.14em] text-[#111111] md:text-[28px]">Best Sellers</h2>
            </div>
            <Link to="/best" className="group inline-flex items-center gap-1.5 border-b border-[#111111]/25 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#111111] transition-colors duration-300 hover:border-[#111111]">
              View All <ArrowRight size={11} />
            </Link>
          </motion.div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {best.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {/* ═══ CAMPAIGN — Performance ═════════════════════════════════ */}
      <section className="mt-16 md:mt-24">
        <Link to="/men" className="group relative block h-[70vh] min-h-[420px] overflow-hidden bg-white">
          <img src={`${IMG}/editorial-performance.jpg`} alt="Move with purpose" loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/75">Hushae Performance</p>
              <h2 className="mt-4 text-[clamp(28px,4vw,46px)] font-light uppercase leading-[1.08] tracking-[0.14em] [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
                Move With Purpose
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[13px] font-light leading-[1.8] text-white/85">
                Engineered essentials for every moment.
              </p>
              <span className="mt-8 inline-flex items-center gap-2 border-b border-white/40 pb-1 text-[12px] font-medium uppercase tracking-[0.18em] text-white transition-colors duration-300 group-hover:border-white">
                Shop Now <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ═══ NEW ARRIVALS ═══════════════════════════════════════════ */}
      {fresh && fresh.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 md:mt-24 md:px-8">
          <motion.div {...fadeUp} className="mb-8 flex items-baseline justify-between border-t border-[#E5E5E5] pt-5">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#707070]">Just Landed</p>
              <h2 className="mt-2 text-[22px] font-light uppercase tracking-[0.14em] text-[#111111] md:text-[28px]">New Arrivals</h2>
            </div>
            <Link to="/new" className="group inline-flex items-center gap-1.5 border-b border-[#111111]/25 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#111111] transition-colors duration-300 hover:border-[#111111]">
              View All <ArrowRight size={11} />
            </Link>
          </motion.div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {fresh.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {/* ═══ #HUSHAE ════════════════════════════════════════════════ */}
      <section className="mt-16 md:mt-24">
        <Link to="/new" className="group relative block h-[60vh] min-h-[380px] overflow-hidden bg-white">
          <img src={`${IMG}/hero-men.jpg`} alt="Share your look" loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
            <div>
              <h2 className="text-[clamp(28px,5vw,44px)] font-light uppercase tracking-[0.2em] [text-shadow:0_2px_24px_rgba(0,0,0,0.4)]">#HUSHAE</h2>
              <p className="mx-auto mt-4 max-w-xl text-[13px] font-light leading-[1.8] text-white/85">
                Share your look. Tag @hushae and #HUSHAE on Instagram for a chance to be featured.
              </p>
              <span className="mt-8 inline-flex items-center gap-2 border-b border-white/40 pb-1 text-[12px] font-medium uppercase tracking-[0.18em] text-white transition-colors duration-300 group-hover:border-white">
                Explore <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
