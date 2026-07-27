import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, Droplets, Layers, Ruler, ShieldCheck, Snowflake, Wind } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { snap } from '../lib/format';
import Img from '../components/Img';
import Marquee from '../components/Marquee';
import FeaturedMarquee from '../components/FeaturedMarquee';
import FeaturedCollections from '../components/FeaturedCollections';
import EditorialBlock from '../components/EditorialBlock';
import SignatureSplitHero from '../components/SignatureSplitHero';
import TrustBadges from '../components/TrustBadges';
import ProductRow from '../components/ProductRow';
import { ProductGridSkeleton } from '../components/Skeletons';
import Seo, { organizationJsonLd } from '../components/Seo';

const FABRIC_TECH = [
  { icon: Wind, title: 'Breathable', text: 'Open-cell knits that let skin breathe through Pakistani summers.' },
  { icon: Snowflake, title: 'Cooling', text: 'Cool-touch yarns that feel a degree lighter on contact.' },
  { icon: Layers, title: 'Seamless', text: 'Bonded, laser-cut edges — invisible under the closest fits.' },
  { icon: Droplets, title: 'Sweat Control', text: 'Wicking fibres pull moisture away and dry fast.' },
  { icon: ShieldCheck, title: 'Support', text: 'Engineered contouring that holds without digging in.' },
];

const fadeUp = { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.6 } };

export default function Home() {
  const { settings, recent } = useApp();
  const [cats, setCats] = useState([]);
  const [best, setBest] = useState(null);
  const [signature, setSignature] = useState(null);
  const [trending, setTrending] = useState(null);
  const s = settings || {};
  const hero = s.hero || {};
  const [nl, setNl] = useState('');
  const [nlDone, setNlDone] = useState(false);

  useEffect(() => {
    api('/categories').then((d) => setCats(d.categories)).catch(() => {});
    api('/products?bestSeller=true&limit=10').then((d) => setBest(d.products)).catch(() => setBest([]));
    api('/products?featured=true&limit=10').then((d) => setSignature(d.products)).catch(() => setSignature([]));
    api('/products/trending?limit=8').then((d) => setTrending(d.products || [])).catch(() => setTrending([]));
  }, []);

  const wCats = cats.filter((c) => c.gender === 'women');
  const mCats = cats.filter((c) => c.gender === 'men');

  return (
    <div>
      <Seo
        title={null}
        description="Premium innerwear brand in Pakistan — bras, briefs, shapewear, robes and more. COD nationwide, free shipping over PKR 4,999, discreet packaging always."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org"
      />
      {/* HERO */}
      {hero.fullScreen ? (
        <HeroFullScreen hero={hero} />
      ) : (
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-14">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">{hero.eyebrow || 'Premium innerwear · Made in Pakistan'}</p>
            <h1 className="mt-4 whitespace-pre-line font-display text-4xl leading-[1.12] md:text-6xl">
              {hero.title || 'Second Skin,\nFirst Choice.'}
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ash">
              {hero.subtitle || 'Underwear engineered in breathable, cloud-soft fabrics.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/women" className="btn-primary">{hero.ctaWomen || 'Shop Women'} <ArrowRight size={15} /></Link>
              <Link to="/men" className="btn-outline">{hero.ctaMen || 'Shop Men'}</Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-[11px] uppercase tracking-widest text-ash">
              <span>3 tiers — Economy to Signature</span><span className="h-3 w-px bg-line" /><span>100+ styles</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-satin/70" />
            <Img src={hero.image || 'https://images.unsplash.com/photo-1519744792095-2f2205e87b6f?auto=format&fit=crop&w=1600&q=80'}
              alt="HUSHAE editorial" className="aspect-[4/5] w-full rounded-[2.5rem] object-cover md:aspect-[5/6]" />
            <div className="absolute bottom-5 left-5 rounded-2xl bg-alabaster/90 px-5 py-4 shadow-card backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sagedeep">The Silk Eclipse Edit</p>
              <p className="mt-1 text-sm font-medium">Featherweight layers, zero-dig fits</p>
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* Featured products — dark auto-sliding strip right after the hero */}
      <FeaturedMarquee
        products={(signature && signature.length ? signature : best) || []}
        title="Signature Pieces"
      />

      {/* ═══════════════════════════════════════════════════════════
          EDITORIAL BLOCKS — HUSHAE magazine-style storefront
          Inspired by CK/Skims/Everlane but original discreet-luxury voice
          ═══════════════════════════════════════════════════════════ */}

      {/* Block 1 — Half/Half split hero — Women (left) + Men (right), CK "Classic Calvins" style */}
      <SignatureSplitHero />

      {/* Block 2 — Women highlight (image right, copy left, warm) */}
      <EditorialBlock
        eyebrow="For her"
        title={"Quiet, considered,\nyours."}
        subtitle="Bras that vanish under a slip dress. Briefs cut for real bodies. Lounge sets you'll live in."
        image="/images/products/cat-bras-hero.jpg"
        ctas={[
          { label: 'Shop the Edit', to: '/women' },
          { label: 'View Bras', to: '/category/bras' },
        ]}
        imageSide="right"
      />

      {/* Block 3 — Men highlight (image left, copy right) */}
      <EditorialBlock
        eyebrow="For him"
        title={"Everyday essentials,\nrefined."}
        subtitle="Modal-cotton briefs, contoured trunks and thermal layers — engineered for the daily rotation."
        image="/images/products/cat-briefs-hero.jpg"
        ctas={[
          { label: 'Shop the Edit', to: '/men' },
          { label: 'View Briefs', to: '/category/briefs' },
        ]}
        imageSide="left"
      />

      {/* Block 4 — Full-bleed overlay hero for a category push */}
      <EditorialBlock
        eyebrow="Discreet always"
        title={"Delivered in plain,\nunmarked parcels."}
        subtitle="Every order ships in a signature HUSHAE parcel with zero product references on the outside. Because what you wear beneath is only ever your business."
        image="/images/products/cat-sleepwear-hero.jpg"
        ctas={[
          { label: 'Shop All', to: '/shop' },
        ]}
        overlay
        tall
      />

      <Marquee />

      {/* Featured collections — pulls collections flagged featuredOnHome by admin */}
      <FeaturedCollections />

      <div className="mt-14"><TrustBadges /></div>

      {/* CATEGORIES section removed per user — replaced by Featured Collections + editorial blocks */}

      {/* BEST SELLERS */}
      <div className="mt-24">
        {best === null
          ? <div className="mx-auto max-w-7xl px-4 md:px-8"><ProductGridSkeleton count={4} /></div>
          : <motion.div {...fadeUp}><ProductRow eyebrow="Loved across Pakistan" title="Best Sellers" products={best.map(snap)} note="Restocked weekly" /></motion.div>}
      </div>

      {/* TRENDING — most-ordered products in the last 30 days */}
      {Array.isArray(trending) && trending.length > 0 && (
        <motion.div {...fadeUp} className="mt-24">
          <ProductRow
            eyebrow="Flying off the shelves"
            title="Trending Now"
            products={trending.map(snap)}
            note={`Top ${trending.length} by recent orders`}
          />
        </motion.div>
      )}

      {/* FIT FINDER CTA */}
      <motion.section {...fadeUp} className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-obsidian px-6 py-14 text-center text-alabaster md:py-20">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sage/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-satin/10 blur-3xl" />
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-alabaster/10"><Ruler size={22} /></span>
          <h2 className="mt-6 font-display text-3xl md:text-4xl">Never guess your size again</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-alabaster/70">
            Answer four quick questions and our Fit Finder recommends your true HUSHAE size — for him and for her.
          </p>
          <Link to="/fit-finder" className="mt-8 inline-flex items-center gap-2 rounded-full bg-alabaster px-8 py-3.5 text-[13px] font-semibold uppercase tracking-widest text-obsidian transition hover:bg-white">
            Start Fit Finder <ArrowRight size={15} />
          </Link>
        </div>
      </motion.section>

      {/* FABRIC TECH */}
      <section className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
        <motion.div {...fadeUp} className="mb-10 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Fabric technology</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Engineered to disappear</h2>
        </motion.div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {FABRIC_TECH.map(({ icon: Icon, title, text }, i) => (
            <motion.div key={title} {...fadeUp} transition={{ delay: i * 0.06 }} className="card p-6 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-sage/20 text-sagedeep"><Icon size={19} strokeWidth={1.8} /></span>
              <p className="mt-4 text-sm font-semibold uppercase tracking-wider">{title}</p>
              <p className="mt-2 text-xs leading-relaxed text-ash">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SIGNATURE */}
      <div className="mt-24">
        {signature && <motion.div {...fadeUp}><ProductRow eyebrow="The Signature Edit" title="Premium, perfected" products={signature.map(snap)} note="Silk-touch finishes" /></motion.div>}
      </div>

      {/* Recently Viewed removed per user request */}

      {/* TESTIMONIALS */}
      <motion.section {...fadeUp} className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Loved by</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Women & men across Pakistan</h2>
          <div className="mt-4 flex items-center justify-center gap-1">
            {[1,2,3,4,5].map((i) => <span key={i} className="text-lg text-amber-500">★</span>)}
            <span className="ml-2 text-[12px] font-semibold text-neutral-700">4.9 · 320+ reviews</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: 'Ayesha K.',    city: 'Lahore',      rating: 5, text: 'The fit is unreal — it disappears under everything. Discreet packaging is a huge plus, felt private and premium.', tier: 'Verified buyer' },
            { name: 'Muhammad H.',  city: 'Karachi',     rating: 5, text: 'Best undershirts I have ever owned. Breathable in Karachi summers and the fit holds after many washes.', tier: 'Verified buyer' },
            { name: 'Sana R.',      city: 'Islamabad',   rating: 5, text: 'Ordered the shapewear for a wedding, arrived in 2 days. Comfortable, no lines, no sliding. Ordering more.', tier: 'Verified buyer' },
          ].map((r, i) => (
            <div key={i} className="rounded-3xl border border-line bg-white/70 p-6">
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: r.rating }).map((_, k) => <span key={k}>★</span>)}
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-obsidian">"{r.text}"</p>
              <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-obsidian text-[11px] font-bold text-alabaster">{r.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}</span>
                <div>
                  <p className="text-[13px] font-semibold text-obsidian">{r.name}</p>
                  <p className="text-[10.5px] uppercase tracking-wider text-ash">{r.city} · {r.tier}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* PRESS / TRUST BAR */}
      <motion.section {...fadeUp} className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
        <div className="rounded-[2rem] border border-line bg-white/60 px-6 py-10 md:py-12">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-ash">Why choose HUSHAE</p>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { title: 'Discreet',       sub: 'Unmarked packaging on every order' },
              { title: 'Nationwide',     sub: 'COD across all of Pakistan' },
              { title: 'Free ship',      sub: 'On orders over PKR 4,999' },
              { title: '14-day exchange',sub: 'Easy size swaps within two weeks' },
            ].map((x, i) => (
              <div key={i} className="text-center">
                <p className="font-display text-lg md:text-xl">{x.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ash">{x.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* NEWSLETTER */}
      <motion.section {...fadeUp} className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
        <div className="rounded-[2.5rem] bg-satin/60 px-6 py-14 text-center">
          <h2 className="font-display text-2xl md:text-3xl">Join the inner circle</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ash">Early access to new drops, fit guides and private offers. No noise, ever.</p>
          {nlDone ? (
            <p className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-sage/25 px-5 py-3 text-sm font-medium text-sagedeep">
              Welcome in. Your first edit arrives soon.
            </p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (nl.includes('@')) { localStorage.setItem('hushae.newsletter', nl); setNlDone(true); } }}
              className="mx-auto mt-6 flex max-w-md gap-2 rounded-full border border-line bg-white/70 p-1.5">
              <input type="email" required value={nl} onChange={(e) => setNl(e.target.value)} placeholder="Your email address"
                className="w-full bg-transparent px-4 text-sm outline-none placeholder:text-ash/60" />
              <button className="btn-primary !px-6 !py-2.5 !text-[11px]">Subscribe</button>
            </form>
          )}
        </div>
      </motion.section>
    </div>
  );
}

/* ============================================================================
 * HeroFullScreen — Blaire-inspired full-viewport hero
 * Features:
 *   - Video with poster fallback (autoplay/muted/loop/playsInline for iOS)
 *   - Separate mobile image (< 768px) if configured
 *   - Adjustable dark overlay opacity for text readability
 *   - "buttons" mode: 2 CTA buttons (Women / Men) — classic
 *   - "dropdown" mode: single "Shop" button that opens a menu — like Blaire
 *   - Eyebrow, title, subtitle, badges — all admin-editable
 * ========================================================================== */
function HeroFullScreen({ hero }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const align = hero.align === 'center' ? 'text-center' : '';
  const overlay = Math.max(0, Math.min(100, Number(hero.overlayOpacity ?? 55))) / 100;
  const shopMenu = Array.isArray(hero.shopMenu) && hero.shopMenu.length ? hero.shopMenu : [
    { label: 'New Arrivals', href: '/new' },
    { label: 'Women', href: '/women' },
    { label: 'Men', href: '/men' },
    { label: 'Sale', href: '/sale' },
  ];

  // Close dropdown on outside click / Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onEsc); };
  }, [menuOpen]);

  const posterOrImage = hero.poster || hero.image || undefined;
  const heroImage = hero.image || '/images/hero/hushae-hero.jpg';
  const badges = Array.isArray(hero.badges) ? hero.badges.filter(Boolean) : [];
  const showButtons = hero.showButtons !== false;

  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-obsidian">
      {/* Media layer */}
      {hero.video ? (
        <video
          src={hero.video}
          poster={posterOrImage}
          autoPlay muted loop playsInline preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        />
      ) : (
        <img src={heroImage} alt="HUSHAE editorial" className="absolute inset-0 h-full w-full object-cover" />
      )}

      {/* Adjustable dark overlay for text contrast */}
      <div className="absolute inset-0" aria-hidden="true"
        style={{ background: `linear-gradient(to top, rgba(13,13,13,${Math.min(0.95, overlay + 0.25)}) 0%, rgba(13,13,13,${overlay}) 45%, rgba(13,13,13,${Math.max(0, overlay - 0.35)}) 100%)` }} />

      {/* Content */}
      <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
        className={`relative z-10 mx-auto w-full max-w-7xl px-5 pb-14 md:px-8 md:pb-24 ${align}`}>
        {hero.eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-alabaster/80 sm:text-[11px]">{hero.eyebrow}</p>
        )}
        <h1 className="mt-3 whitespace-pre-line font-display text-[44px] leading-[1.02] text-alabaster sm:text-5xl md:text-7xl lg:text-8xl">
          {hero.title || 'Second Skin,\nFirst Choice.'}
        </h1>
        {hero.subtitle && (
          <p className={`mt-5 max-w-xl text-[15px] leading-relaxed text-alabaster/85 ${hero.align === 'center' ? 'mx-auto' : ''}`}>
            {hero.subtitle}
          </p>
        )}

        <div className={`mt-8 flex flex-wrap items-center gap-4 ${hero.align === 'center' ? 'justify-center' : ''}`}>
          {showButtons && (hero.ctaStyle === 'dropdown' ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-alabaster px-8 py-4 text-[13px] font-semibold uppercase tracking-widest text-obsidian transition hover:bg-alabaster/90 active:scale-[0.99]"
              >
                {hero.ctaWomen || 'Shop Now'}
                <ChevronDown size={16} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    role="menu"
                    className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-alabaster/20 bg-alabaster shadow-2xl"
                  >
                    {shopMenu.map((it, i) => (
                      <Link
                        key={i}
                        to={it.href || '/shop'}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="block px-5 py-3 text-[13px] font-medium text-obsidian transition hover:bg-satin"
                      >
                        {it.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link to="/women" className="inline-flex items-center justify-center gap-2 rounded-full bg-alabaster px-7 py-3.5 text-[13px] font-semibold uppercase tracking-widest text-obsidian transition hover:bg-alabaster/90 active:scale-[0.99]">
                {hero.ctaWomen || 'Shop Women'} <ArrowRight size={15} />
              </Link>
              <Link to="/men" className="inline-flex items-center justify-center gap-2 rounded-full border border-alabaster/50 px-7 py-3.5 text-[13px] font-semibold uppercase tracking-widest text-alabaster transition hover:bg-alabaster hover:text-obsidian active:scale-[0.99]">
                {hero.ctaMen || 'Shop Men'}
              </Link>
            </>
          ))}
        </div>

        {badges.length > 0 && (
          <div className={`mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-widest text-alabaster/60 ${hero.align === 'center' ? 'justify-center' : ''}`}>
            {badges.map((b, i) => (
              <span key={i} className="flex items-center gap-6">
                {b}
                {i < badges.length - 1 && <span className="h-3 w-px bg-alabaster/30" />}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
