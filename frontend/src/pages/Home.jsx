import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Droplets, Layers, Ruler, ShieldCheck, Snowflake, Wind } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { snap } from '../lib/format';
import Img from '../components/Img';
import TrustBadges from '../components/TrustBadges';
import ProductRow from '../components/ProductRow';
import { ProductGridSkeleton } from '../components/Skeletons';

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
  const s = settings || {};
  const hero = s.hero || {};
  const [nl, setNl] = useState('');
  const [nlDone, setNlDone] = useState(false);

  useEffect(() => {
    api('/categories').then((d) => setCats(d.categories)).catch(() => {});
    api('/products?bestSeller=true&limit=10').then((d) => setBest(d.products)).catch(() => setBest([]));
    api('/products?featured=true&limit=10').then((d) => setSignature(d.products)).catch(() => setSignature([]));
  }, []);

  const wCats = cats.filter((c) => c.gender === 'women');
  const mCats = cats.filter((c) => c.gender === 'men');

  return (
    <div>
      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-14">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Premium innerwear · Made in Pakistan</p>
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
              alt="VÉLOURA editorial" className="aspect-[4/5] w-full rounded-[2.5rem] object-cover md:aspect-[5/6]" />
            <div className="absolute bottom-5 left-5 rounded-2xl bg-alabaster/90 px-5 py-4 shadow-card backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sagedeep">The Silk Eclipse Edit</p>
              <p className="mt-1 text-sm font-medium">Featherweight layers, zero-dig fits</p>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mt-14"><TrustBadges /></div>

      {/* CATEGORIES */}
      <section className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
        <motion.div {...fadeUp} className="mb-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Shop by category</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Find your layer</h2>
        </motion.div>
        {[['Women', '/women', wCats], ['Men', '/men', mCats]].map(([g, to, list], gi) => (
          <div key={g} className={gi ? 'mt-12' : ''}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-xl">{g}</h3>
              <Link to={to} className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-ash transition hover:text-obsidian">
                View all {g} <ArrowRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {list.map((c, i) => (
                <motion.div key={c.slug} {...fadeUp} transition={{ delay: i * 0.05 }}>
                  <Link to={`/category/${c.slug}`} className="group relative block overflow-hidden rounded-3xl">
                    <Img src={c.image} alt={c.name} className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian/55 via-obsidian/5 to-transparent" />
                    <p className="absolute bottom-4 left-4 right-4 text-sm font-semibold tracking-wide text-alabaster">{c.name}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* BEST SELLERS */}
      <div className="mt-24">
        {best === null
          ? <div className="mx-auto max-w-7xl px-4 md:px-8"><ProductGridSkeleton count={4} /></div>
          : <motion.div {...fadeUp}><ProductRow eyebrow="Loved across Pakistan" title="Best Sellers" products={best.map(snap)} note="Restocked weekly" /></motion.div>}
      </div>

      {/* FIT FINDER CTA */}
      <motion.section {...fadeUp} className="mx-auto mt-24 max-w-7xl px-4 md:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-obsidian px-6 py-14 text-center text-alabaster md:py-20">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sage/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-satin/10 blur-3xl" />
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-alabaster/10"><Ruler size={22} /></span>
          <h2 className="mt-6 font-display text-3xl md:text-4xl">Never guess your size again</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-alabaster/70">
            Answer four quick questions and our Fit Finder recommends your true VÉLOURA size — for him and for her.
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

      {/* RECENTLY VIEWED */}
      {recent.length > 0 && (
        <div className="mt-24"><ProductRow eyebrow="Pick up where you left off" title="Recently Viewed" products={recent} /></div>
      )}

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
            <form onSubmit={(e) => { e.preventDefault(); if (nl.includes('@')) { localStorage.setItem('veloura.newsletter', nl); setNlDone(true); } }}
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
