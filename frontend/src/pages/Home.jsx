import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Droplets, Layers, Ruler, ShieldCheck, Snowflake, Wind } from 'lucide-react';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
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
  const [cats, setCats] = useState([]);
  const [best, setBest] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [nl, setNl] = useState('');
  const [nlDone, setNlDone] = useState(false);

  useEffect(() => {
    api('/categories').then((d) => setCats(d.categories)).catch(() => {});
    api('/products?bestSeller=true&limit=10').then((d) => setBest(d.products)).catch(() => setBest([]));
    api('/products?featured=true&limit=10').then((d) => setFeatured(d.products)).catch(() => setFeatured([]));
  }, []);

  const wCats = cats.filter((c) => c.gender === 'women');
  const mCats = cats.filter((c) => c.gender === 'men');

  return (
    <div>
      <Seo title="Premium Innerwear for Men & Women"
        description="Premium innerwear engineered for comfort. Made in Pakistan, finished to an international standard."
        canonical="/"
        jsonLd={organizationJsonLd(typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="home-org" />

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-14">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Premium innerwear · Made in Pakistan</p>
            <h1 className="mt-4 whitespace-pre-line font-display text-4xl leading-[1.12] md:text-6xl">
              Second Skin,{'\n'}First Choice.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ash">
              Underwear engineered in breathable, cloud-soft fabrics.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/women" className="btn-primary">Shop Women <ArrowRight size={15} /></Link>
              <Link to="/men" className="btn-outline">Shop Men</Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-[11px] uppercase tracking-widest text-ash">
              <span>3 tiers — Economy to Signature</span>
              <span className="h-3 w-px bg-line" />
              <span>100+ styles</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-satin/70" />
            {/* own campaign photography — slow cinematic settle (no stock) */}
            <motion.img
              src="/images/campaign/qa/hero-women.jpg"
              alt="HUSHAE editorial — second skin"
              initial={{ scale: 1.06 }}
              animate={{ scale: 1 }}
              transition={{ duration: 10, ease: 'easeOut' }}
              className="aspect-[4/5] w-full rounded-[2.5rem] object-cover object-center md:aspect-[5/6]"
            />
            <div className="absolute bottom-5 left-5 rounded-2xl bg-alabaster/90 px-5 py-4 shadow-card backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sagedeep">The Silk Eclipse Edit</p>
              <p className="mt-1 text-sm font-medium">Featherweight layers, zero-dig fits</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <div className="mt-14">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid grid-cols-3 gap-4 rounded-2xl border border-line bg-alabaster p-6 text-center md:p-8">
            {[
              ['Free Shipping', 'On orders over PKR 4,999'],
              ['Discreet Packaging', 'Plain, unmarked parcels'],
              ['14-Day Exchange', 'Free size swaps'],
            ].map(([h, t]) => (
              <div key={h}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-obsidian">{h}</p>
                <p className="mt-1 text-[11px] text-ash">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CATEGORIES */}
      <section className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
        <motion.div {...fadeUp} className="mb-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">The Edit</p>
          <h2 className="mt-2 font-display text-2xl md:text-3xl">Shop by Category</h2>
        </motion.div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {wCats.map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} className="group rounded-2xl border border-line bg-alabaster p-5 text-center transition hover:border-sage hover:shadow-soft">
              <p className="text-sm font-semibold text-obsidian group-hover:text-sagedeep">{c.name}</p>
              <p className="mt-1 text-[11px] text-ash">Women</p>
            </Link>
          ))}
          {mCats.map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} className="group rounded-2xl border border-line bg-alabaster p-5 text-center transition hover:border-sage hover:shadow-soft">
              <p className="text-sm font-semibold text-obsidian group-hover:text-sagedeep">{c.name}</p>
              <p className="mt-1 text-[11px] text-ash">Men</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FABRIC TECH */}
      <section className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
        <motion.div {...fadeUp} className="mb-10 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">The Technology</p>
          <h2 className="mt-2 font-display text-2xl md:text-3xl">Engineered for Comfort</h2>
        </motion.div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {FABRIC_TECH.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-line bg-alabaster p-6 text-center transition hover:shadow-soft">
              <Icon size={22} className="mx-auto text-sage" />
              <p className="mt-3 text-sm font-semibold text-obsidian">{title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ash">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BEST SELLERS */}
      {best && best.length > 0 && (
        <section className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
          <motion.div {...fadeUp} className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Loved</p>
              <h2 className="mt-2 font-display text-2xl md:text-3xl">Best Sellers</h2>
            </div>
            <Link to="/best" className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-widest text-ash hover:text-sagedeep">
              View all <ArrowRight size={14} />
            </Link>
          </motion.div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {best.slice(0, 10).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {/* FEATURED */}
      {featured && featured.length > 0 && (
        <section className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
          <motion.div {...fadeUp} className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Signature</p>
              <h2 className="mt-2 font-display text-2xl md:text-3xl">Premium Picks</h2>
            </div>
            <Link to="/shop?tier=Premium" className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-widest text-ash hover:text-sagedeep">
              Shop all <ArrowRight size={14} />
            </Link>
          </motion.div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {featured.slice(0, 10).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}

      {/* NEWSLETTER */}
      <section className="mt-24 border-t border-line bg-satin/40 py-16 md:py-20">
        <div className="mx-auto max-w-xl px-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Stay in touch</p>
          <h2 className="mt-2 font-display text-2xl">Join the Circle</h2>
          <p className="mt-2 text-sm text-ash">Early access to new drops. No spam, ever.</p>
          {nlDone ? (
            <p className="mt-6 text-sm font-semibold text-sagedeep">You&apos;re on the list.</p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (nl.trim()) { setNlDone(true); setNl(''); } }} className="mt-6 flex gap-2">
              <input type="email" value={nl} onChange={(e) => setNl(e.target.value)} required placeholder="Your email"
                className="input flex-1" />
              <button type="submit" className="btn-primary">Subscribe</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
