import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Droplets, Layers, Ruler, ShieldCheck, Snowflake, Wind } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { snap } from '../lib/format';
import Img from '../components/Img';
import Marquee from '../components/Marquee';
import FeaturedCollections from '../components/FeaturedCollections';
import Diptych from '../components/home/Diptych';
import TheEdit from '../components/home/TheEdit';
import EditorialStory from '../components/home/EditorialStory';
import ProductGrid from '../components/home/ProductGrid';
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
  const [fresh, setFresh] = useState(null);
  const s = settings || {};
  const hero = s.hero || {};
  const [nl, setNl] = useState('');
  const [nlDone, setNlDone] = useState(false);

  useEffect(() => {
    api('/categories').then((d) => setCats(d.categories)).catch(() => {});
    api('/products?bestSeller=true&limit=10').then((d) => setBest(d.products)).catch(() => setBest([]));
    api('/products?featured=true&limit=10').then((d) => setSignature(d.products)).catch(() => setSignature([]));
    /* PHASE 6. Was /products/trending, whose carousel Phase 5 deleted — the
       request was still firing and its result discarded. Repurposed for the
       New Arrivals grid the blueprint calls for, so the section costs no extra
       round trip. */
    /* newDays, not sort=newest. MEASURED: sort=newest returned 10 bras in the
       first 12 products, because the catalogue was seeded category by category
       — a "New arrivals" spread of six near-identical bras is worse than no
       section. newDays=30 spans 10 categories across 12 products. */
    api('/products?newDays=30&limit=6').then((d) => setFresh(d.products || [])).catch(() => setFresh([]));
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
      {/* PHASE 6. The last carousel is gone. It was a 623px auto-sliding
          strip fed by the SAME `signature` array that TheEdit composition
          below already presents — the page showed one set of products twice,
          once as a scrub-strip and once as a composition. The blueprint has no
          slider anywhere, and a duplicate of adjacent content is the weakest
          possible reason for a section to exist. */}

      {/* ═══════════════════════════════════════════════════════════
          EDITORIAL BLOCKS — HUSHAE magazine-style storefront
          Inspired by CK/Skims/Everlane but original discreet-luxury voice
          ═══════════════════════════════════════════════════════════ */}

      {/* PHASE 5 — DIPTYCH replaces the split hero + two alternating editorial
          blocks. MEASURED: those three sections ran 1000 + 960 + 960 = 2,920px,
          nearly three screens, to say one thing — HUSHAE makes innerwear for
          women and for men. Alternating image-left/image-right is the most
          common layout in any ecommerce theme and reads as a feature list.
          Two plates sharing one horizon say it in a single glance. */}
      <Diptych />

      {/* PHASE 5 — THE EDIT replaces the "Signature" carousel. See the
          component for the measurement: four carousels on one page, three of
          them the same component with a different heading. A composition has a
          subject; a carousel gives everything equal weight and hides most of
          it behind a gesture. */}
      {signature && signature.length >= 3 && (
        <TheEdit
          eyebrow="The Signature Edit"
          title={'Premium,\nperfected.'}
          blurb="Silk-touch finishes, limited restock — the pieces we make no compromises on."
          products={signature.map(snap)}
          href="/shop?tier=Premium"
          ctaLabel="View the edit"
        />
      )}

      {/* Featured collections — pulls collections flagged featuredOnHome by admin */}
      <FeaturedCollections />

      <div className="mt-14"><TrustBadges /></div>

      {/* CATEGORIES section removed per user — replaced by Featured Collections + editorial blocks */}

      {/* PHASE 6 — EDITORIAL STORY. The blueprint's brand chapter, and the
          measured gap: all twelve sections were selling or asking, none simply
          spoke. */}
      <EditorialStory />

      {/* PHASE 6 — NEW ARRIVALS. Blueprint asks for six large plates, no
          slider. ProductGrid is a new shape rather than a reuse of TheEdit:
          TheEdit is deliberately asymmetric because it has a subject, and
          applying that to new arrivals would imply an editor's pick that does
          not exist. Six equals, three across, all visible at once. */}
      {fresh && fresh.length >= 3 && (
        <ProductGrid
          eyebrow="Just arrived"
          title={'New\narrivals.'}
          blurb="The latest additions to the edit, photographed as they land."
          products={fresh.map(snap)}
          href="/new"
          ctaLabel="View new arrivals"
        />
      )}

      {/* PHASE 5 — the last two carousels ("Best Sellers" and "Trending Now")
          were the same ProductRow component a third and fourth time, 966px of
          identical interaction. Best Sellers survives as a composition; the
          Trending row is deleted rather than restyled, because a page does not
          need two "these are popular" statements and the brief was explicit:
          if a section is weak, delete it. */}
      {best === null
        ? <div className="container-page mt-ed-md"><ProductGridSkeleton count={4} /></div>
        : (
          <TheEdit
            eyebrow="Loved across Pakistan"
            title={'Best\nsellers.'}
            blurb="Restocked weekly — the pieces our customers keep coming back for."
            products={best.map(snap)}
            href="/best"
            ctaLabel="View best sellers"
          />
        )}

      {/* FIT FINDER CTA */}
      {/* PHASE 4 editorial rhythm. MEASURED: five consecutive sections all sat
          at exactly mt-24 (96px). Uniform intervals are what make a page read as
          a stack of CMS modules — a magazine varies the gap so a reader feels
          where one movement ends and the next begins.
          ed-sm 72 within a movement · ed-md 120 between movements · ed-lg 176 at
          a chapter break. Mobile keeps one rung, because uniform pacing IS
          correct on a narrow column; the scale only opens from xl. */}
      <motion.section {...fadeUp} className="container-page mt-ed-md xl:mt-ed-md">
        {/* PHASE 5. Was a 40px-rounded slab with two blurred coloured orbs
            behind it — a gradient-hero device from SaaS marketing pages, and
            the only place on the site still using blur as decoration. Now a
            square black plate: type, rule, action. Nothing else. */}
        <div className="relative overflow-hidden bg-obsidian px-6 py-16 text-center text-alabaster md:py-24">
          <span className="mx-auto grid h-12 w-12 place-items-center border border-alabaster/25"><Ruler size={20} strokeWidth={1.5} /></span>
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
      <section className="container-page mt-ed-md xl:mt-ed-sm">
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
      <motion.section {...fadeUp} className="container-page mt-ed-md xl:mt-ed-lg">
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
      <motion.section {...fadeUp} className="container-page mt-ed-md xl:mt-ed-md">
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
      <motion.section {...fadeUp} className="container-page mt-ed-md xl:mt-ed-sm">
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
