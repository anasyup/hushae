import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Banner from '../components/Banner';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME — cloned from the REAL calvinklein.com homepage structure.
 *
 * Section order (mirrors CK exactly):
 *   1. Announcement bar            (OfferBar — in Header)
 *   2. HERO                        full-bleed image + headline + Shop Women/Men
 *   3. PROMOTIONS                  admin banners with buttons (user request)
 *   4. CATEGORY TRAY               image tiles + label below + Shop links (CK "Denim/Jackets/Dresses")
 *   5. EDITORIAL SUB-SECTION       headline + copy + 2 image tiles (CK "Feel the Fit")
 *   6. JUST IN                     new arrivals + rail (CK "Just In")
 *   7. SIGNATURE                   headline + copy + 2 tiles (CK "Signature Underwear")
 *   8. REWARDS BAND                (CK "My Calvin Rewards")
 *   9. VISUAL NAV STRIP            quick links (CK "Tees/Shorts/Swim")
 *   10. EMAIL SIGNUP               (CK "Get 10% Off")
 *
 * Layout principles taken from the live site: image-led sections, hairline
 * dividers, generous whitespace, uppercase light tracked headlines, quiet
 * secondary gray, black buttons only where CK uses them.
 * ========================================================================== */

const fadeUp = { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.6 } };
const IMG = '/images/campaign/qa';

/* ── CK hero tray — image tile + label below + Shop links ───────────────── */
const TRAY = [
  { label: 'Bras', img: `${IMG}/cat-women.jpg`, shop: '/category/bras' },
  { label: 'Panties', img: `${IMG}/cat-underwear.jpg`, shop: '/category/panties' },
  { label: 'Boxers', img: `${IMG}/cat-men.jpg`, shop: '/category/boxers' },
  { label: 'Loungewear', img: `${IMG}/hero-fabric.jpg`, shop: '/category/sleepwear-loungewear' },
];

/* ── Visual nav strip — quick links (CK "90s Utility · Tees · Shorts") ─── */
const QUICKLINKS = [
  { label: 'Bras', href: '/category/bras' },
  { label: 'Briefs', href: '/category/briefs' },
  { label: 'Shapewear', href: '/category/shapewear' },
  { label: 'New Arrivals', href: '/new' },
  { label: 'Sale', href: '/sale' },
  { label: 'Best Sellers', href: '/best' },
];

/* ── Promotional fallback tile (when no admin banner is published) ──────── */
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
  const [fresh, setFresh] = useState(null);

  useEffect(() => {
    api('/products?newArrival=true&limit=8').then((d) => setFresh(d.products || [])).catch(() => setFresh([]));
  }, []);

  return (
    <div className="bg-white font-sans text-[#111111]">
      <Seo title="Premium Innerwear for Men & Women"
        description="New season essentials, engineered for comfort. Made in Pakistan, finished to an international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* ═══ 02 — HERO (CK: full-bleed + headline + dual CTA) ═════════ */}
      <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden bg-white">
        <img src={`${IMG}/hero-women.jpg`} alt="Second skin" fetchpriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center text-white">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/80 [text-shadow:0_1px_16px_rgba(0,0,0,0.4)]">The New Edit</p>
          <h1 className="mt-6 text-[clamp(40px,7vw,80px)] font-medium uppercase leading-[1.02] tracking-[0.04em] [text-shadow:0_2px_32px_rgba(0,0,0,0.45)]">Second<br />Skin</h1>
          <p className="mt-6 max-w-md text-[15px] font-normal leading-[1.6] tracking-[0.02em] text-white/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.4)]">
            New season essentials — engineered in Pakistan, finished to an international standard.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-10">
            <Link to="/women" className="group inline-flex items-center gap-2 border-b border-white/40 pb-1 text-[12px] font-medium uppercase tracking-[0.08em] text-white transition-colors duration-300 hover:border-white">
              Shop Women <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link to="/men" className="group inline-flex items-center gap-2 border-b border-white/40 pb-1 text-[12px] font-medium uppercase tracking-[0.08em] text-white transition-colors duration-300 hover:border-white">
              Shop Men <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 03 — PROMOTIONS (admin banners, user request) ═══════════ */}
      <section className="mx-auto mt-14 max-w-7xl px-4 md:mt-20 md:px-8">
        <div className="mb-6 flex items-baseline justify-between border-t border-[#E5E5E5] pt-4">
          <h2 className="text-[20px] font-medium uppercase tracking-[0.02em] text-[#111111]">This Week</h2>
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-[#696969] md:block">Promotions</span>
        </div>
        <Banner
          slot="homepage-promo-1"
          className="aspect-[16/9] w-full overflow-hidden md:aspect-[21/8]"
          fallback={(
            <PromoTile img={`${IMG}/editorial-modern.jpg`} eyebrow="The Summer Edit" title="Signature comfort, up to 30% off" sub="The pieces that define the season — now at their quiet best." cta="Shop Sale" to="/sale" />
          )}
        />
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Banner slot="homepage-promo-2" className="aspect-[16/10] w-full overflow-hidden"
            fallback={<PromoTile img={`${IMG}/hero-women.jpg`} eyebrow="New Arrivals" title="The Second Skin collection" sub="Featherweight layers, zero-dig fits." cta="Shop New" to="/new" />} />
          <Banner slot="homepage-promo-3" className="aspect-[16/10] w-full overflow-hidden"
            fallback={<PromoTile img={`${IMG}/hero-fabric.jpg`} eyebrow="Free Shipping" title="Over PKR 4,999 — nationwide" sub="Discreet, unmarked packaging on every order." cta="Explore" to="/women" />} />
        </div>
      </section>

      {/* ═══ 04 — CATEGORY TRAY (CK: image + label + Shop links) ═════ */}
      <section className="mx-auto mt-14 max-w-7xl px-4 md:mt-20 md:px-8">
        <div className="mb-8 flex items-baseline justify-between border-t border-[#E5E5E5] pt-4">
          <h2 className="text-[20px] font-medium uppercase tracking-[0.02em] text-[#111111]">Shop by Category</h2>
          <Link to="/shop" className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-[#696969] transition hover:text-[#111111] md:block">View All</Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-5">
          {TRAY.map((t) => (
            <div key={t.label} className="group">
              <Link to={t.shop} className="block overflow-hidden bg-[#FAFAFA]">
                <img src={t.img} alt={t.label} loading="lazy"
                  className="aspect-[3/4] w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
              </Link>
              <div className="mt-4 flex items-baseline justify-between px-0.5">
                <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[#111111]">{t.label}</p>
                <Link to={t.shop} className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#696969] transition group-hover:text-[#111111]">
                  Shop <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 05 — EDITORIAL SUB-SECTION (CK "Feel the Fit") ══════════ */}
      <section className="mt-14 md:mt-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="max-w-2xl">
            <h2 className="text-[24px] font-medium uppercase tracking-[0.02em] text-[#111111] md:text-[32px]">Feel the Fit</h2>
            <p className="mt-3 max-w-md text-[15px] font-normal leading-[1.6] text-[#696969]">
              From relaxed and breezy to streamlined and supportive — the right fit changes everything.
            </p>
            <Link to="/fit-finder" className="mt-5 inline-flex items-center gap-2 border-b border-[#111111]/25 pb-1 text-[12px] font-medium uppercase tracking-[0.08em] text-[#111111] transition hover:border-[#111111]">
              Find your fit <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-8 grid max-w-7xl gap-5 px-4 md:grid-cols-2 md:px-8">
          <Link to="/women" className="group relative block aspect-[16/10] overflow-hidden bg-white">
            <img src={`${IMG}/cat-women.jpg`} alt="Women's" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="text-[15px] font-medium uppercase tracking-[0.04em] text-white">Women&apos;s Edit</p>
              <span className="mt-1 inline-block text-[10px] font-medium uppercase tracking-[0.18em] text-white/80">Shop Now →</span>
            </div>
          </Link>
          <Link to="/men" className="group relative block aspect-[16/10] overflow-hidden bg-white">
            <img src={`${IMG}/cat-men.jpg`} alt="Men's" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="text-[15px] font-medium uppercase tracking-[0.04em] text-white">Men&apos;s Edit</p>
              <span className="mt-1 inline-block text-[10px] font-medium uppercase tracking-[0.18em] text-white/80">Shop Now →</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ═══ 06 — JUST IN (CK: new arrivals) ════════════════════════ */}
      {fresh && fresh.length > 0 && (
        <section className="mx-auto mt-14 max-w-7xl px-4 md:mt-24 md:px-8">
          <div className="mb-8 flex items-baseline justify-between border-t border-[#E5E5E5] pt-4">
            <div>
              <h2 className="text-[20px] font-medium uppercase tracking-[0.02em] text-[#111111]">Just In</h2>
              <p className="mt-1 text-[12px] text-[#707070]">New, minimalist staples to refresh your wardrobe with ease.</p>
            </div>
            <Link to="/new" className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-[#696969] transition hover:text-[#111111] md:block">Shop All</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {fresh.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {/* ═══ 07 — SIGNATURE (CK "Signature Underwear") ═══════════════ */}
      <section className="mt-14 md:mt-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="max-w-2xl">
            <h2 className="text-[24px] font-medium uppercase tracking-[0.02em] text-[#111111] md:text-[32px]">Signature Underwear</h2>
            <p className="mt-3 max-w-md text-[15px] font-normal leading-[1.6] text-[#696969]">
              Smooth silhouettes with the logo waistband. Feel confident under anything.
            </p>
            <div className="mt-5 flex flex-wrap gap-8">
              <Link to="/women" className="inline-flex items-center gap-2 border-b border-[#111111]/25 pb-1 text-[12px] font-medium uppercase tracking-[0.08em] text-[#111111] transition hover:border-[#111111]">
                Shop Women <ArrowRight size={13} />
              </Link>
              <Link to="/men" className="inline-flex items-center gap-2 border-b border-[#111111]/25 pb-1 text-[12px] font-medium uppercase tracking-[0.08em] text-[#111111] transition hover:border-[#111111]">
                Shop Men <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 grid max-w-7xl gap-5 px-4 md:grid-cols-2 md:px-8">
          <Link to="/category/bras" className="group relative block aspect-[16/10] overflow-hidden bg-white">
            <img src={`${IMG}/hero-women.jpg`} alt="Women's underwear" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          </Link>
          <Link to="/category/briefs" className="group relative block aspect-[16/10] overflow-hidden bg-white">
            <img src={`${IMG}/hero-men.jpg`} alt="Men's underwear" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          </Link>
        </div>
      </section>

      {/* ═══ 08 — REWARDS BAND (CK "My Calvin Rewards") ══════════════ */}
      <section className="mt-14 md:mt-24">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center md:px-8 md:py-20">
          <h2 className="text-[24px] font-medium uppercase tracking-[0.02em] text-[#111111] md:text-[32px]">My Hushae Circle</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] font-normal leading-[1.6] text-[#696969]">
            Earn. Redeem. Enjoy. A new way to experience HUSHAE — points, rewards and exclusive benefits.
          </p>
          <Link to="/rewards" className="mt-6 inline-flex min-h-[46px] items-center justify-center bg-[#111111] px-10 text-[12px] font-medium uppercase tracking-[0.16em] text-white transition-colors duration-300 hover:bg-[#333333]">
            Learn More
          </Link>
        </div>
      </section>

      {/* ═══ 09 — VISUAL NAV STRIP (CK "Tees · Shorts · Swim") ═══════ */}
      <section className="border-y border-[#E5E5E5]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6 md:px-8">
          {QUICKLINKS.map((l) => (
            <Link key={l.label} to={l.href}
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#707070] transition hover:text-[#111111]">
              {l.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ 10 — EMAIL SIGNUP (CK "Get 10% Off") ═══════════════════ */}
      <NewsletterBand />

      {/* ═══ #HUSHAE ════════════════════════════════════════════════ */}
      <section className="mt-14 md:mt-20">
        <Link to="/new" className="group relative block h-[55vh] min-h-[360px] overflow-hidden bg-white">
          <img src={`${IMG}/editorial-performance.jpg`} alt="Share your look" loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
            <div>
              <h2 className="text-[clamp(28px,5vw,44px)] font-medium uppercase tracking-[0.04em] [text-shadow:0_2px_24px_rgba(0,0,0,0.4)]">#HUSHAE</h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] font-normal leading-[1.6] text-white/90">
                Share your look. Tag @hushae and #HUSHAE on Instagram for a chance to be featured.
              </p>
              <span className="mt-8 inline-flex items-center gap-2 border-b border-white/40 pb-1 text-[12px] font-medium uppercase tracking-[0.08em] text-white transition-colors duration-300 group-hover:border-white">
                Explore <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}

/* ── Email signup band (CK "Get Your 10% Off") ─────────────────────────── */
function NewsletterBand() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return (
    <section className="mx-auto mt-14 max-w-7xl px-4 md:mt-20 md:px-8">
      <div className="border border-[#E5E5E5] px-6 py-14 text-center md:py-16">
        <h2 className="text-[22px] font-medium uppercase tracking-[0.02em] text-[#111111] md:text-[28px]">Get 10% Off</h2>
        <p className="mx-auto mt-3 max-w-sm text-[15px] font-normal leading-[1.6] text-[#696969]">
          Join the circle for early access to new drops, fit guides and private offers.
        </p>
        {done ? (
          <p className="mt-6 text-[12px] font-medium uppercase tracking-[0.16em] text-[#111111]">You&apos;re on the list.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) { api('/subscribers', { method: 'POST', body: { email: email.trim() } }).catch(() => {}); setDone(true); } }}
            className="mx-auto mt-6 flex max-w-md items-end gap-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Your email"
              className="min-h-[46px] w-full min-w-0 flex-1 border-0 border-b border-[#111111]/30 bg-transparent pb-2 text-[15px] font-normal text-[#111111] outline-none transition-colors placeholder:text-[#696969]/60 focus:border-[#111111]" />
            <button type="submit"
              className="min-h-[46px] shrink-0 bg-[#111111] px-8 text-[11px] font-medium uppercase tracking-[0.16em] text-white transition-colors duration-300 hover:bg-[#333333]">
              Sign Up
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
