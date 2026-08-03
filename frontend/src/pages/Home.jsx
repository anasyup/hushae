import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Ruler } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { snap } from '../lib/format';
import Diptych from '../components/home/Diptych';
import TheEdit from '../components/home/TheEdit';
import EditorialStory from '../components/home/EditorialStory';
import CommunityGrid from '../components/CommunityGrid';
import ProductRow from '../components/ProductRow';
import { ProductGridSkeleton } from '../components/Skeletons';
import Seo, { organizationJsonLd } from '../components/Seo';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

export default function Home() {
  const { settings, recent } = useApp();
  const [cats, setCats] = useState([]);
  const [best, setBest] = useState(null);
  const [signature, setSignature] = useState(null);
  const s = settings || {};
  const hero = s.hero || {};
  const [nl, setNl] = useState('');
  const [nlDone, setNlDone] = useState(false);

  useEffect(() => {
    api('/categories').then((d) => setCats(d.categories)).catch(() => {});
    api('/products?bestSeller=true&limit=4').then((d) => setBest(d.products)).catch(() => setBest([]));
    api('/products?featured=true&limit=4').then((d) => setSignature(d.products)).catch(() => setSignature([]));
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (nl.trim()) {
      setNlDone(true);
      setNl('');
    }
  };

  return (
    <div className="bg-[#FBFAF8] text-[#000000] font-sans antialiased selection:bg-[#000000] selection:text-[#FFFFFF]">
      <Seo
        title="Modern Essentials · Underwear & Innerwear"
        description="Shop minimal, premium basics and innerwear by HUSHAE. Engineered for maximum comfort, breathable fabrics, and high-fashion aesthetics."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org"
      />

      {/* ── 1. CINEMATIC FULL-SCREEN CAMPAIGN HERO (Calvin Klein USA Style) ── */}
      <section className="relative h-screen w-full overflow-hidden bg-[#000000]" aria-label="Hero Campaign">
        {hero.video ? (
          <video
            src={hero.video}
            poster={hero.image || '/images/hero/hero-still.jpg'}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
        ) : (
          <img
            src={hero.image || '/images/products/gemini/hero-women-bra.png'}
            alt="HUSHAE Luxury Editorial Campaign"
            className="absolute inset-0 h-full w-full object-cover opacity-75"
          />
        )}
        
        {/* Soft elegant vignette gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000]/60 via-transparent to-[#000000]/25" />

        {/* Content Box */}
        <div className="absolute inset-x-0 bottom-20 md:bottom-28 z-10 flex flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#FFFFFF]/80">
              {hero.eyebrow || 'HUSHAE · LUXURY CLASSICS'}
            </p>
            <h1 className="mt-4 font-display text-4xl font-light uppercase tracking-[0.04em] text-[#FFFFFF] leading-[1.05] sm:text-6xl lg:text-7xl">
              {hero.title ? hero.title.replace('\n', ' ') : 'SENSORY LUXURY.'}
            </h1>
            <p className="mt-4 text-[13px] md:text-[14px] leading-relaxed text-[#FFFFFF]/85 max-w-md mx-auto font-light">
              {hero.subtitle || 'Breathable second-skin layers. Tailored with strict geometric precision.'}
            </p>
            
            {/* Elegant rectangular flat buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/women"
                className="inline-flex min-h-[46px] items-center justify-center rounded-[2px] bg-[#FFFFFF] px-9 text-xs font-bold uppercase tracking-widest text-[#000000] transition duration-300 hover:bg-[#000000] hover:text-[#FFFFFF] focus-visible:ring-2 focus-visible:ring-[#FFFFFF]"
              >
                Shop Women
              </Link>
              <Link
                to="/men"
                className="inline-flex min-h-[46px] items-center justify-center rounded-[2px] border border-[#FFFFFF] bg-transparent px-9 text-xs font-bold uppercase tracking-widest text-[#FFFFFF] transition duration-300 hover:bg-[#FFFFFF] hover:text-[#000000] focus-visible:ring-2 focus-visible:ring-[#FFFFFF]"
              >
                Shop Men
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 2. THE EDITORIAL DIPTYCH (Asymmetrical Campaign Split) ── */}
      <section className="container-page py-24 md:py-32">
        <Diptych />
      </section>

      {/* ── 3. CURATED CAMPAIGN ROW (The Signature Edit) ── */}
      {signature && signature.length > 0 && (
        <section className="bg-[#FFFFFF] py-24 border-t border-b border-[#E4E0DA] md:py-32">
          <TheEdit
            eyebrow="HIGH-DEMAND BASICS"
            title="THE SIGNATURE EDIT."
            blurb="Limited drops, curated with luxury fanned materials and soft organic contours."
            products={signature.map(snap)}
            href="/shop?tier=Premium"
            ctaLabel="Shop the edit"
          />
        </section>
      )}

      {/* ── 4. BRAND STORY CHAPTER (The Editorial Register) ── */}
      <section className="bg-[#000000] text-[#FFFFFF] py-24 md:py-32">
        <EditorialStory />
      </section>

      {/* ── 5. HIGH CONTRAST CAMPAIGN BANNER (Calvin Klein style with unique buttons) ── */}
      <section className="relative h-[65vh] w-full overflow-hidden bg-[#000000] border-t border-b border-[#E4E0DA]" aria-label="Seasonal Campaign">
        <img
          src="/images/collection/band-neutral.jpg"
          alt="HUSHAE Luxury Campaign"
          className="absolute inset-0 h-full w-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-[#000000]/30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <motion.div {...fadeUp} className="max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FFFFFF]/80">NEW SEASON DROPS</p>
            <h2 className="mt-4 font-display text-3xl font-light uppercase tracking-[0.05em] text-[#FFFFFF] sm:text-5xl leading-none">
              UNCONVENTIONAL COMFORT.
            </h2>
            <p className="mt-4 text-xs font-light text-[#FFFFFF]/90 max-w-sm mx-auto leading-relaxed">
              Experience signature support engineered in breathable fanned-cotton layers.
            </p>
            
            {/* Unique Asymmetric Offset Border Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              <Link
                to="/women"
                className="relative inline-flex min-h-[46px] items-center justify-center bg-[#FFFFFF] px-8 text-xs font-bold uppercase tracking-widest text-[#000000] border-l-4 border-b-4 border-[#6B7252] transition-transform duration-200 hover:-translate-y-1 hover:bg-[#000000] hover:text-[#FFFFFF]"
              >
                Explore Women
              </Link>
              <Link
                to="/men"
                className="relative inline-flex min-h-[46px] items-center justify-center bg-[#000000] border border-[#FFFFFF] px-8 text-xs font-bold uppercase tracking-widest text-[#FFFFFF] border-r-4 border-t-4 border-[#6B7252] transition-transform duration-200 hover:-translate-y-1 hover:bg-[#FFFFFF] hover:text-[#000000]"
              >
                Explore Men
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 6. CURATED BEST SELLERS ROW (Loved Silhouettes) ── */}
      {best && best.length > 0 && (
        <section className="bg-[#FFFFFF] py-24 border-t border-b border-[#E4E0DA] md:py-32">
          <TheEdit
            mirrored
            eyebrow="BEST SELLING ESSENTIALS"
            title="THE DAILY ROTATION."
            blurb="Our community-approved basics that have earned a permanent position in daily comfort."
            products={best.map(snap)}
            href="/best"
            ctaLabel="View all best sellers"
          />
        </section>
      )}

      {/* ── 7. FIT FINDER SERVICE BLOCK ── */}
      <motion.section {...fadeUp} className="container-page py-24 md:py-32">
        <div className="relative overflow-hidden bg-[#000000] px-6 py-16 text-[#FFFFFF] md:px-16 md:py-24">
          <div className="grid items-center gap-x-12 gap-y-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FFFFFF]/70">THE SIZE SERVICE</p>
              <h2 className="mt-3 font-display text-3xl font-light uppercase tracking-[0.05em] leading-[1.05] sm:text-5xl">
                Find your exact HUSHAE fit.
              </h2>
            </div>
            <div className="border-t border-[#FFFFFF]/15 pt-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
              <p className="text-[13px] leading-relaxed text-[#FFFFFF]/85 font-light">
                No tape measures required. Answer four brief biometric questions, and our specialized Fit Finder calculates your true size across all contours.
              </p>
              <Link 
                to="/fit-finder" 
                className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-[2px] bg-[#FFFFFF] px-6 text-xs font-bold uppercase tracking-widest text-[#000000] transition duration-300 hover:bg-[#6B7252] hover:text-[#FFFFFF]"
              >
                Start Fit Finder &rarr;
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── 8. SOCIAL PROOF GRID (Instagram) ── */}
      <section className="bg-[#FFFFFF] border-t border-[#E4E0DA]">
        <CommunityGrid
          href={s?.integrations?.social?.instagram || ''}
          handle={s?.integrations?.social?.instagramHandle || '@hushae.pk'}
        />
      </section>

      {/* ── 9. HIGH CONTRAST NEWSLETTER SIGNUP ── */}
      <section className="bg-[#000000] text-[#FFFFFF] py-24 text-center md:py-32">
        <motion.div {...fadeUp} className="mx-auto max-w-xl px-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#FFFFFF]/70">JOIN THE CIRCLE</p>
          <h2 className="mt-4 font-display text-3xl font-light uppercase tracking-[0.05em] sm:text-4xl">
            Never miss a drop.
          </h2>
          <p className="mt-4 text-xs font-light text-[#FFFFFF]/70 max-w-sm mx-auto leading-relaxed">
            Early access to new colorways, exclusive members-only collections, and fanned-fabric guides. No spam, ever.
          </p>
          
          {nlDone ? (
            <div role="status" className="mt-8 text-xs font-semibold text-[#FFFFFF] uppercase tracking-widest">
              ✓ Welcome to HUSHAE. You are on the list.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="mt-8 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <input
                type="email"
                value={nl}
                onChange={(e) => setNl(e.target.value)}
                placeholder="Enter your email address"
                required
                className="h-11 flex-1 rounded-[2px] border border-[#FFFFFF]/25 bg-transparent px-4 text-xs text-[#FFFFFF] placeholder:text-[#FFFFFF]/50 focus:border-[#FFFFFF] focus:outline-none"
              />
              <button
                type="submit"
                className="h-11 rounded-[2px] bg-[#FFFFFF] px-6 text-xs font-bold uppercase tracking-widest text-[#000000] transition duration-300 hover:bg-[#6B7252] hover:text-[#FFFFFF]"
              >
                Subscribe
              </button>
            </form>
          )}
        </motion.div>
      </section>
    </div>
  );
}
