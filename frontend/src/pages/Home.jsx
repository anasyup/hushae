import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Droplets, Layers, Ruler, ShieldCheck, Snowflake, Wind } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { snap } from '../lib/format';
import Img from '../components/Img';
import Marquee from '../components/Marquee';
import FeaturedMarquee from '../components/FeaturedMarquee';
import FeaturedCollections from '../components/FeaturedCollections';
import EditorialBlock from '../components/EditorialBlock';
import SignatureSplitHero from '../components/SignatureSplitHero';
import CommunityGrid from '../components/CommunityGrid';
import TrustBadges from '../components/TrustBadges';
import ProductRow from '../components/ProductRow';
import { AnimatedProductListSection } from '../components/ProductListSection';
import { ProductGridSkeleton } from '../components/Skeletons';
import Seo, { organizationJsonLd } from '../components/Seo';
import HeroFullScreen from '../components/hero/HeroFullScreen';

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
      <section className="container-page pt-8 md:pt-14">
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

      {/* Premium, perfected — Signature product row directly under the split hero */}
      {signature && signature.length > 0 && (
        <div className="mt-14 md:mt-20">
          <motion.div {...fadeUp}>
            <ProductRow
              eyebrow="The Signature Edit"
              title="Premium, perfected"
              products={signature.map(snap)}
              note="Silk-touch finishes · limited restock"
            />
          </motion.div>
        </div>
      )}

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

      {/* ══════════════════════════════════════════════════════════════════
          ADMIN-BUILT PRODUCT SECTIONS
          Everything here is created and configured from the Theme Editor
          (/admin/theme → Template → Product sections). Add, remove, reorder
          and restyle rows without touching code.
          ══════════════════════════════════════════════════════════════════ */}
      {(s.productSections || []).map((ps) => (
        <AnimatedProductListSection key={ps.id} cfg={ps} />
      ))}

      {/* Featured collections — pulls collections flagged featuredOnHome by admin */}
      <FeaturedCollections />

      <div className="mt-14"><TrustBadges /></div>

      {/* CATEGORIES section removed per user — replaced by Featured Collections + editorial blocks */}

      {/* BEST SELLERS */}
      <div className="mt-24">
        {best === null
          ? <div className="container-page"><ProductGridSkeleton count={4} /></div>
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
      <motion.section {...fadeUp} className="container-page mt-24">
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
      <section className="container-page mt-24">
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

      {/* Signature row moved up to sit under the split hero */}

      {/* Recently viewed — OFF by default because the merchant had this row
          removed from the home page in an earlier sprint. It returns only when
          they switch it on in Admin → Settings → Customer Experience. */}
      {(() => {
        const rv = settings?.customerExperience?.recentlyViewed;
        if (!rv?.enabled || !rv?.showOnHome || recent.length === 0) return null;
        return (
          <div className="mt-sect-y">
            <ProductRow eyebrow="Your history" title={rv.title || 'Recently viewed'} products={recent.slice(0, 8)} />
          </div>
        );
      })()}

      {/* TESTIMONIALS */}
      <motion.section {...fadeUp} className="container-page mt-24">
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

      {/* COMMUNITY / INSTAGRAM
          Placed after the testimonials and before the trust bar: the page has
          just claimed people love the product, so photographs of it in real
          wardrobes are the evidence for that claim. Putting it after the trust
          bar would bury it under the newsletter.
          The handle and profile URL come from Settings → Integrations → Social,
          which is currently EMPTY on live — the component falls back to an
          in-app CTA rather than rendering a dead link. */}
      <CommunityGrid
        href={settings?.integrations?.social?.instagram || ''}
        handle={settings?.integrations?.social?.instagramHandle || '@hushae.pk'}
      />

      {/* PRESS / TRUST BAR */}
      <motion.section {...fadeUp} className="container-page mt-24">
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
      <motion.section {...fadeUp} className="container-page mt-24">
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
