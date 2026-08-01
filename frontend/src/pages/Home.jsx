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
            mirrored
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
        {/* PHASE 9. MEASURED at 1440: the plate was centred with a 36px h2, a
            14px paragraph and a 9999px-radius CTA — the last pill button left
            in a primary position on the page, sitting on the one black plate
            where it is most visible. Centre-stacked type over a wide dark field
            also wastes the plate: 1,232px of measure carrying a 448px column.
            Now an asymmetric editorial plate. Type sits left on the page grid
            at the same rungs the refined sections use (label / h2 / body), the
            action moves to the right edge as a drawn rule, and a hairline
            divides them so the plate reads as a spread rather than a banner. */}
        <div className="relative overflow-hidden bg-obsidian px-6 py-14 text-alabaster md:px-12 md:py-16 xl:px-16 xl:py-20">
          <div className="grid items-end gap-x-12 gap-y-8 xl:grid-cols-[1.4fr_1fr]">
            <div className="max-w-[46ch]">
              <span className="grid h-11 w-11 place-items-center border border-alabaster/25"><Ruler size={18} strokeWidth={1.5} /></span>
              <p className="mt-6 text-label uppercase tracking-[0.24em] text-alabaster/60">The fit service</p>
              <h2 className="mt-3 whitespace-pre-line font-display text-h2 leading-[1.04] text-alabaster">
                {'Never guess\nyour size again.'}
              </h2>
            </div>
            {/* V2.1. MEASURED at 1440: the right column sat with `pb-1`, so
                its copy and action floated at the vertical centre of the plate
                while the title block was bottom-aligned — the two halves of one
                dark plate did not share a baseline.
                A hairline now opens the column and the block is pinned to the
                foot of the grid, so both halves rest on the same line.

                1. Better: the plate reads as one object, not two stacked ideas.
                2. HUSHAE: the opening rule is the house mark, already used on
                   the hero eyebrow and the trust columns.
                3. Not a copy: same 1px alabaster/20 rule and ed-* rhythm the
                   rest of this page already uses. */}
            <div className="border-t border-alabaster/20 pt-7 xl:pt-8">
              <p className="max-w-[46ch] text-body-sm leading-[1.65] text-alabaster/75">
                Answer four quick questions and our Fit Finder recommends your true HUSHAE size — for him and for her.
              </p>
              <Link to="/fit-finder" className="cta-editorial-light mt-7">
                Start Fit Finder
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* FABRIC TECH */}
      {/* PHASE 9 — FABRIC TECHNOLOGY.
          MEASURED: five bordered boxes, each with a circular sage chip, a 14px
          title and 12px body — the smallest body copy on the page, and the
          only remaining place where a coloured circle carries an icon. Five
          boxed cards in a row is the "feature grid" every SaaS template ships.
          A house states its properties as a specification list, not as cards.
          Now a ruled table: no boxes, no fills, no circles. A hairline above
          each column, the icon drawn at line weight in ink, and the type on
          the real rungs (label-lg / body-sm). The rules give the row its
          structure, which is what the borders were badly imitating. */}
      <section className="container-page mt-ed-md xl:mt-ed-sm">
        <motion.div {...fadeUp} className="max-w-2xl">
          <p className="text-label uppercase tracking-[0.24em] text-sagedeep">Fabric technology</p>
          <h2 className="mt-3 font-display text-h2 leading-[1.04] text-obsidian">Engineered to disappear</h2>
        </motion.div>
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-5 md:gap-x-8 xl:mt-14">
          {/* V2.1. MEASURED: the rule opened each column, then the icon sat
              alone on its own line with the label 16px below it — three
              separate horizontal bands per column, so the eye read icon,
              pause, word, pause, sentence. A specification list should read as
              one unit per property.
              Icon and label now share a baseline row, the body sits under
              them, and the rule darkens on hover so the whole column responds
              rather than nothing at all.

              1. Better: five properties scan as five items, not fifteen.
              2. HUSHAE: line-weight 1.25 icons on a hairline — the same
                 drawn-not-filled language as the rest of the page.
              3. Not a copy: our own `line`/`obsidian` tokens and the same
                 hover treatment the product card caption already uses. */}
          {FABRIC_TECH.map(({ icon: Icon, title, text }, i) => (
            <motion.div key={title} {...fadeUp} transition={{ delay: i * 0.06 }}
              className="group/spec border-t border-line pt-5 transition-colors duration-base ease-standard hover:border-obsidian/35">
              <div className="flex items-center gap-3">
                <Icon size={18} strokeWidth={1.25} className="shrink-0 text-obsidian" aria-hidden="true" />
                <p className="text-label-lg font-medium uppercase tracking-[0.18em] text-obsidian">{title}</p>
              </div>
              <p className="mt-3 max-w-[30ch] text-body-sm leading-[1.65] text-ash">{text}</p>
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
        {/* PHASE 9 — TESTIMONIALS.
            MEASURED: 24px-radius cards, amber ★ glyphs at rgb(245,158,11) and
            a rating line in rgb(64,64,64) — the ONLY off-palette text colour
            found anywhere in an 8-route sweep. Amber stars are the single most
            recognisable review-widget tell on the internet; a fashion house
            sets the words and the name, not a rating badge.
            Type-led quotes on hairlines, no boxes, no stars, no avatars. */}
        <div className="max-w-2xl">
          <p className="text-label uppercase tracking-[0.24em] text-sagedeep">Loved by</p>
          <h2 className="mt-3 font-display text-h2 leading-[1.04] text-obsidian">Women &amp; men across Pakistan</h2>
        </div>
        <div className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-3 xl:mt-14 xl:gap-x-14">
          {[
            { name: 'Ayesha K.',    city: 'Lahore',      text: 'The fit is unreal — it disappears under everything. Discreet packaging is a huge plus, felt private and premium.', tier: 'Verified buyer' },
            { name: 'Muhammad H.',  city: 'Karachi',     text: 'Best undershirts I have ever owned. Breathable in Karachi summers and the fit holds after many washes.', tier: 'Verified buyer' },
            { name: 'Sana R.',      city: 'Islamabad',   text: 'Ordered the shapewear for a wedding, arrived in 2 days. Comfortable, no lines, no sliding. Ordering more.', tier: 'Verified buyer' },
          ].map((r, i) => (
            <figure key={i} className="border-t border-line pt-6">
              {/* Cormorant at body-lg: the quote is the largest thing in its
                  column, which is how a magazine signals a pull quote without
                  a box around it. */}
              <blockquote className="font-display text-body-lg leading-[1.55] text-obsidian">
                &ldquo;{r.text}&rdquo;
              </blockquote>
              <figcaption className="mt-6 text-label uppercase leading-[1.7] tracking-[0.18em] text-ash">
                {r.name} · {r.city}
                <span className="block text-ash/80">{r.tier}</span>
              </figcaption>
            </figure>
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
        {/* PHASE 9 — WHY HUSHAE.
            MEASURED: a 32px-radius white slab, a 10px label (the smallest text
            on the page) and 11px sub-copy. The rounded slab is the shape a
            dashboard uses for a stats widget. Squared to the page, the label
            promoted to the same rung every other section uses, and the four
            promises separated by vertical hairlines so they read as one
            statement in four parts rather than four floating captions. */}
        <div className="border-y border-line py-10 md:py-14">
          <p className="text-label uppercase tracking-[0.24em] text-ash">Why choose HUSHAE</p>
          <div className="mt-8 grid grid-cols-2 gap-y-8 sm:grid-cols-4">
            {[
              { title: 'Discreet',       sub: 'Unmarked packaging on every order' },
              { title: 'Nationwide',     sub: 'COD across all of Pakistan' },
              { title: 'Free ship',      sub: 'On orders over PKR 4,999' },
              { title: '14-day exchange',sub: 'Easy size swaps within two weeks' },
            ].map((x, i) => (
              <div key={i} className={i > 0 ? 'sm:border-l sm:border-line sm:pl-8' : ''}>
                <p className="font-display text-h3 leading-[1.1] text-obsidian">{x.title}</p>
                <p className="mt-2 max-w-[24ch] text-body-sm leading-relaxed text-ash">{x.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* NEWSLETTER */}
      <motion.section {...fadeUp} className="container-page mt-ed-md xl:mt-ed-sm">
        {/* PHASE 9 — NEWSLETTER.
            MEASURED: a 40px-radius satin blob holding a 9999px-radius form
            with a 30px h2 — the roundest object on the site, and the last
            place a pill wrapped an input. Every squared control the rest of
            the store uses was contradicted here at the final scroll position,
            which is the last impression the page leaves.
            Squared satin plate, type left on the grid, and the form rebuilt as
            a single ruled line: the input is an underline, the action is the
            house button. Nothing is enclosed. */}
        <div className="bg-satin/60 px-6 py-14 md:px-12 md:py-16 xl:px-16 xl:py-20">
          <div className="grid items-end gap-x-12 gap-y-8 xl:grid-cols-[1fr_1fr]">
            {/* V2.1 — DUPLICATE FOUND AND RESOLVED.
                MEASURED: "Join the inner circle" rendered TWICE on this page —
                here, and again 200px lower in the footer, each with its own
                email field. Two identical asks stacked back to back is the
                clearest possible signal that nobody composed the page end to
                end. Worse, they behave differently: the footer form POSTs to
                /api/subscribers, this one only wrote to localStorage.
                Neither section is removed. This one is re-pitched as what it
                actually is — the editorial invitation, with the fit-guide and
                early-access promise — while the footer keeps the plain utility
                signup. Different words, different weight, one page.

                1. Better: the page stops asking the same question twice.
                2. HUSHAE: the promise here is discretion and first access,
                   which is the brand's own language, not generic "subscribe".
                3. Not a copy: no reference brand informed this; it is a
                   measured duplication being resolved. */}
            <div className="max-w-[42ch]">
              <p className="text-label uppercase tracking-[0.24em] text-sagedeep">The inner circle</p>
              <h2 className="mt-3 font-display text-h2 leading-[1.04] text-obsidian">First look, before anyone else.</h2>
              <p className="mt-4 text-body-sm leading-[1.65] text-ash">New drops and fit guides, sent quietly. No noise, and never your inbox for anything else.</p>
            </div>
            {nlDone ? (
              <p role="status" className="border-t border-obsidian/20 pt-5 text-body-sm font-medium text-sagedark">
                Welcome in. Your first edit arrives soon.
              </p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (nl.includes('@')) { localStorage.setItem('hushae.newsletter', nl); setNlDone(true); } }}
                className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label htmlFor="home-nl" className="text-label uppercase tracking-[0.18em] text-ash">Email address</label>
                  {/* V2. The rule thickens rather than only darkening on focus:
                      a 1px line changing colour is easy to miss, and this is
                      the only input on the homepage. min-h 44 -> 48 so the
                      field and the button share one optical height. */}
                  <input id="home-nl" type="email" required value={nl} onChange={(e) => setNl(e.target.value)} placeholder="you@example.com"
                    className="mt-2 min-h-[48px] w-full border-0 border-b-[1.5px] border-obsidian/20 bg-transparent pb-2 text-body text-obsidian outline-none transition-colors duration-base placeholder:text-ash/55 focus:border-obsidian focus-visible:ring-0" />
                </div>
                <button className="btn-primary min-h-[48px] shrink-0">Subscribe</button>
              </form>
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
