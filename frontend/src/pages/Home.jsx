import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, Lock, RotateCcw, Truck } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import Banner from '../components/Banner';
import Seo, { organizationJsonLd } from '../components/Seo';

/* ============================================================================
 * HUSHAE HOME — the ultimate luxury homepage.
 *
 * Synthesised from 15+ premium references (Bella Webflow template + 4 tall
 * Dribbble homepages + earlier CK study). Structure:
 *   1  HERO            cinematic 3-slide crossfade, arrows + dots, CTA button
 *   2  PERKS           icon trust row (Quality / Shipping / Secure / Returns)
 *   3  PROMOTIONS      admin hero-banner band (user feature, buttons)
 *   4  MEN / WOMEN     split editorial blocks
 *   5  CATEGORIES      real category imagery, image tiles + labels
 *   6  BEST SELLERS    product grid
 *   7  PROMO BANNER    "The Signature Edit" full-bleed editorial + CTA
 *   8  JOURNAL         real blog posts
 *   9  VALUES          grey commitment band
 *   10 NEWSLETTER      "Get 10% Off" borderless input + button
 *   11 #HUSHAE         social call-out
 *
 * Palette stays the approved warm-luxury register: white / #111 / #696969
 * hairlines, gold #C9A96E as the only accent.
 * ========================================================================== */

const IMG = '/images/campaign/qa';

/* ── Perks — Bella-style icon trust row ─────────────────────────────────── */
const PERKS = [
  { Icon: Award, title: '100% Quality', text: 'Every piece wash-tested for 40 cycles' },
  { Icon: Truck, title: 'Free Shipping', text: 'On orders over PKR 4,999' },
  { Icon: Lock, title: 'Secure Payment', text: 'COD nationwide · encrypted checkout' },
  { Icon: RotateCcw, title: 'Free Returns', text: '14-day exchange, free size swaps' },
];

/* ── Category tiles — real category images ──────────────────────────────── */
const CATEGORIES = [
  { label: 'Bras', img: '/images/categories/bras.jpg', href: '/category/bras' },
  { label: 'Panties', img: '/images/categories/panties.jpg', href: '/category/panties' },
  { label: 'Briefs', img: '/images/categories/briefs.jpg', href: '/category/briefs' },
  { label: 'Boxers', img: '/images/categories/boxers.jpg', href: '/category/boxers' },
  { label: 'Loungewear', img: '/images/categories/sleepwear-loungewear.jpg', href: '/category/sleepwear-loungewear' },
];

/* ── Hero — split-section (CK reference): 2 images + center overlay ─────── */
function HeroSlides() {
  return (
    <section className="relative h-[calc(100svh-72px)] min-h-[480px] w-full overflow-hidden bg-white font-sans">
      {/* Split images */}
      <div className="flex h-full w-full flex-col md:flex-row">
        <div className="relative flex-1">
          <img src={`${IMG}/hero-women.jpg`} alt="Women Collection" fetchpriority="high"
            className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/15" aria-hidden="true" />
        </div>
        <div className="relative flex-1">
          <img src={`${IMG}/hero-men.jpg`} alt="Men Collection" loading="lazy"
            className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/15" aria-hidden="true" />
        </div>
      </div>

      {/* Center overlay */}
      <div className="absolute left-1/2 top-[55%] z-10 w-[90%] max-w-[600px] -translate-x-1/2 -translate-y-1/2 text-center text-white">
        <h1 className="text-[42px] font-light leading-[0.95] tracking-[-0.02em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.2)] md:text-[64px]">
          The
          <br />
          Campus
          <br />
          Edit
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[12px] font-normal leading-[1.5] tracking-[0.013em] text-[#f0f0f0] md:text-[13px]">
          Start the year fresh in casual essentials.
          <br />
          Made to transition seamlessly from class to after.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link to="/women"
            className="inline-block rounded-full border border-white bg-white px-6 py-3 text-[12px] font-medium tracking-[0.02em] text-black transition-all duration-200 hover:-translate-y-px hover:bg-[#f0f0f0] md:px-6 md:text-[13px]">
            Shop Women
          </Link>
          <Link to="/men"
            className="inline-block rounded-full border border-white bg-white px-6 py-3 text-[12px] font-medium tracking-[0.02em] text-black transition-all duration-200 hover:-translate-y-px hover:bg-[#f0f0f0] md:px-6 md:text-[13px]">
            Shop Men
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Promotional fallback tile (when no admin banner is published) ──────── */
function PromoTile({ img, eyebrow, title, sub, cta, to }) {
  return (
    <Link to={to} className="group relative block h-full w-full overflow-hidden bg-white">
      <img src={img} alt={title} loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-center px-7 md:px-12">
        {eyebrow && <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#C9A96E]">{eyebrow}</p>}
        <h3 className="mt-2 max-w-md text-2xl font-medium text-white md:text-4xl">{title}</h3>
        {sub && <p className="mt-2 max-w-md text-[13px] text-white/85">{sub}</p>}
        <span className="mt-6 inline-flex min-h-[44px] w-fit items-center justify-center bg-white px-8 text-[11px] font-medium uppercase tracking-[0.18em] text-black transition-colors duration-300 hover:bg-[#C9A96E] hover:text-white">
          {cta}
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const [fresh, setFresh] = useState(null);
  const [best, setBest] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api('/products?bestSeller=true&limit=8').then((d) => setBest(d.products)).catch(() => setBest([]));
    api('/products?newArrival=true&limit=8').then((d) => setFresh(d.products)).catch(() => setFresh([]));
    api('/blog').then((d) => setPosts(d.posts || [])).catch(() => setPosts([]));
  }, []);

  return (
    <div className="bg-white font-sans text-[#111111]">
      <Seo title="Premium Innerwear for Men & Women"
        description="New season essentials, engineered for comfort. Made in Pakistan, finished to an international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* ═══ 01 — HERO: cinematic slideshow ═══════════════════════════ */}
      <HeroSlides />

      {/* ═══ 02 — PERKS: icon trust row ═══════════════════════════════ */}
      <section className="border-b border-[#E5E5E5]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-4 py-10 md:grid-cols-4 md:px-8 md:py-12">
          {PERKS.map(({ Icon, title, text }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <Icon size={22} strokeWidth={1.4} className="text-[#C9A96E]" aria-hidden="true" />
              <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#111111]">{title}</p>
              <p className="mt-1 max-w-[22ch] text-[11px] leading-relaxed text-[#696969]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 03 — PROMOTIONS (admin banners, buttons) ═════════════════ */}
      <section className="mx-auto mt-14 max-w-7xl px-4 md:mt-20 md:px-8">
        <div className="mb-6 flex items-baseline justify-between border-t border-[#E5E5E5] pt-4">
          <h2 className="text-[20px] font-medium uppercase tracking-[0.04em] text-[#111111]">This Week</h2>
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-[#696969] md:block">Promotions</span>
        </div>
        <Banner slot="homepage-promo-1" className="aspect-[16/9] w-full overflow-hidden md:aspect-[21/8]"
          fallback={<PromoTile img={`${IMG}/editorial-modern.jpg`} eyebrow="The Summer Edit" title="Signature comfort, up to 30% off" sub="The pieces that define the season — now at their quiet best." cta="Shop Sale" to="/sale" />} />
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Banner slot="homepage-promo-2" className="aspect-[16/10] w-full overflow-hidden"
            fallback={<PromoTile img={`${IMG}/hero-women.jpg`} eyebrow="New Arrivals" title="The Second Skin collection" sub="Featherweight layers, zero-dig fits." cta="Shop New" to="/new" />} />
          <Banner slot="homepage-promo-3" className="aspect-[16/10] w-full overflow-hidden"
            fallback={<PromoTile img={`${IMG}/hero-fabric.jpg`} eyebrow="Free Shipping" title="Over PKR 4,999 — nationwide" sub="Discreet, unmarked packaging on every order." cta="Explore" to="/women" />} />
        </div>
      </section>

      {/* ═══ 04 — MEN / WOMEN split ═══════════════════════════════════ */}
      <section className="mt-14 md:mt-20">
        <div className="grid md:grid-cols-2">
          <Link to="/women" className="group relative block aspect-[4/5] overflow-hidden bg-white md:aspect-auto md:min-h-[68vh]">
            <img src={`${IMG}/hero-women.jpg`} alt="Women" loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]" />
            <div className="absolute inset-0 bg-black/25 transition-colors duration-500 group-hover:bg-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-8 md:p-12">
              <p className="text-3xl font-medium uppercase tracking-[0.06em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.4)]">Women</p>
              <span className="mt-3 inline-block border-b border-white/60 pb-1 text-[12px] font-medium uppercase tracking-[0.14em] text-white">Shop Now</span>
            </div>
          </Link>
          <Link to="/men" className="group relative block aspect-[4/5] overflow-hidden bg-white md:aspect-auto md:min-h-[68vh]">
            <img src={`${IMG}/hero-men.jpg`} alt="Men" loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]" />
            <div className="absolute inset-0 bg-black/25 transition-colors duration-500 group-hover:bg-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-8 md:p-12">
              <p className="text-3xl font-medium uppercase tracking-[0.06em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.4)]">Men</p>
              <span className="mt-3 inline-block border-b border-white/60 pb-1 text-[12px] font-medium uppercase tracking-[0.14em] text-white">Shop Now</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ═══ 05 — CATEGORIES: real imagery tiles ══════════════════════ */}
      <section className="mx-auto mt-14 max-w-7xl px-4 md:mt-20 md:px-8">
        <div className="mb-8 flex items-baseline justify-between border-t border-[#E5E5E5] pt-4">
          <h2 className="text-[20px] font-medium uppercase tracking-[0.04em] text-[#111111]">Shop by Category</h2>
          <Link to="/shop" className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-[#696969] transition hover:text-[#111111] md:block">View All</Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-5 md:gap-x-5">
          {CATEGORIES.map((c) => (
            <Link key={c.label} to={c.href} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F5F5]">
                <img src={c.img} alt={c.label} loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              </div>
              <div className="mt-3 flex items-baseline justify-between px-0.5">
                <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[#111111]">{c.label}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#696969] transition group-hover:text-[#111111]">
                  Shop <ArrowRight size={11} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ 06 — BEST SELLERS ════════════════════════════════════════ */}
      {best && best.length > 0 && (
        <section className="mx-auto mt-14 max-w-7xl px-4 md:mt-24 md:px-8">
          <div className="mb-8 flex items-baseline justify-between border-t border-[#E5E5E5] pt-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#696969]">Trending Now</p>
              <h2 className="mt-2 text-[22px] font-medium uppercase tracking-[0.04em] text-[#111111] md:text-[28px]">Best Sellers</h2>
            </div>
            <Link to="/best" className="group inline-flex items-center gap-1.5 border-b border-[#111111]/25 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#111111] transition-colors duration-300 hover:border-[#111111]">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {best.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {/* ═══ 07 — PROMO BANNER: The Signature Edit ═════════════════════ */}
      <section className="mt-14 md:mt-24">
        <Link to="/sale" className="group relative block h-[70vh] min-h-[420px] overflow-hidden bg-white">
          <img src={`${IMG}/editorial-performance.jpg`} alt="The Signature Edit" loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#C9A96E]">Limited Season</p>
              <h2 className="mt-4 text-[clamp(30px,5vw,52px)] font-medium uppercase leading-[1.05] tracking-[0.05em] [text-shadow:0_2px_24px_rgba(0,0,0,0.4)]">
                The Signature Edit
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[15px] font-normal leading-[1.6] text-white/85">
                Engineered essentials for every moment — now at their quiet best.
              </p>
              <span className="mt-8 inline-flex min-h-[50px] items-center justify-center border border-white/80 px-10 text-[12px] font-medium uppercase tracking-[0.16em] text-white transition-colors duration-300 group-hover:bg-white group-hover:text-black">
                Shop Now
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ═══ 08 — JOURNAL: real blog posts ════════════════════════════ */}
      {posts.length > 0 && (
        <section className="mx-auto mt-14 max-w-7xl px-4 md:mt-24 md:px-8">
          <div className="mb-8 flex items-baseline justify-between border-t border-[#E5E5E5] pt-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#696969]">The Journal</p>
              <h2 className="mt-2 text-[22px] font-medium uppercase tracking-[0.04em] text-[#111111] md:text-[28px]">Latest Stories</h2>
            </div>
            <Link to="/journal" className="group inline-flex items-center gap-1.5 border-b border-[#111111]/25 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#111111] transition-colors duration-300 hover:border-[#111111]">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {posts.slice(0, 3).map((post) => (
              <Link key={post.slug} to={`/journal/${post.slug}`} className="group block">
                <div className="aspect-[16/10] overflow-hidden bg-[#F5F5F5]">
                  {post.coverImage ? (
                    <img src={post.coverImage} alt={post.title} loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-[#F0F0F0] text-[11px] font-medium uppercase tracking-[0.2em] text-[#696969]">HUSHAE</div>
                  )}
                </div>
                <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.16em] text-[#C9A96E]">
                  {post.category || 'Journal'}
                </p>
                <h3 className="mt-2 text-[15px] font-medium leading-snug normal-case text-[#111111] transition-colors duration-300 group-hover:text-[#696969]">
                  {post.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ 09 — VALUES: commitment band ═════════════════════════════ */}
      <section className="mt-14 bg-[#F5F5F5] md:mt-24">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-8 md:py-24">
          <p className="text-[20px] font-medium uppercase leading-[1.5] tracking-[0.04em] text-[#111111] md:text-[26px]">
            We Are Committed To A Better Future.
          </p>
          <p className="mx-auto mt-4 max-w-md text-[15px] font-normal leading-[1.6] text-[#696969]">
            Responsibly sourced fabrics, honest manufacturing, and packaging that respects the planet.
          </p>
          <Link to="/about"
            className="mt-8 inline-flex items-center gap-2 border-b border-[#111111]/30 pb-1 text-[12px] font-medium uppercase tracking-[0.12em] text-[#111111] transition-colors duration-300 hover:border-[#111111]">
            Our Commitment <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ═══ 10 — NEWSLETTER: Get 10% Off ═════════════════════════════ */}
      <NewsletterBand />

      {/* ═══ 11 — #HUSHAE ═════════════════════════════════════════════ */}
      <section className="mt-14 md:mt-20">
        <Link to="/new" className="group relative block h-[55vh] min-h-[360px] overflow-hidden bg-white">
          <img src={`${IMG}/editorial-modern.jpg`} alt="Share your look" loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
            <div>
              <h2 className="text-[clamp(28px,5vw,44px)] font-medium uppercase tracking-[0.06em] [text-shadow:0_2px_24px_rgba(0,0,0,0.4)]">#HUSHAE</h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] font-normal leading-[1.6] text-white/85">
                Share your look. Tag @hushae and #HUSHAE on Instagram for a chance to be featured.
              </p>
              <span className="mt-8 inline-flex items-center gap-2 border-b border-white/40 pb-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white transition-colors duration-300 group-hover:border-white">
                Explore <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}

/* ── Email signup band — "Get 10% Off" ─────────────────────────────────── */
function NewsletterBand() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return (
    <section className="mx-auto mt-14 max-w-7xl px-4 md:mt-20 md:px-8">
      <div className="border border-[#E5E5E5] px-6 py-14 text-center md:py-16">
        <h2 className="text-[22px] font-medium uppercase tracking-[0.04em] text-[#111111] md:text-[28px]">Get 10% Off</h2>
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
